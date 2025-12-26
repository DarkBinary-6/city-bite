
const express = require('express');
const cors = require('cors');
const { Client } = require("@googlemaps/google-maps-services-js");
const admin = require('firebase-admin');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const webpush = require('web-push');

// --- Configuration ---
const PORT = process.env.PORT || 3001;
const MERCHANT_VPA = process.env.MERCHANT_VPA || 'merchant@upi';
const MERCHANT_NAME = process.env.MERCHANT_NAME || 'CityBite Foods';
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET || 'simulated_secret';
const DB_FILE = path.join(__dirname, '../db.json');

// --- SSE Clients Store ---
let sseClients = [];

// --- VAPID Keys Setup ---
let VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
let VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    const vapidKeys = webpush.generateVAPIDKeys();
    VAPID_PUBLIC_KEY = vapidKeys.publicKey;
    VAPID_PRIVATE_KEY = vapidKeys.privateKey;
}

webpush.setVapidDetails(
    'mailto:admin@citybite.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

// --- Initialize Express ---
const app = express();
app.use(cors());
app.use(express.json());

// --- File DB Helper ---
function readLocalDb() {
    try {
        if (!fs.existsSync(DB_FILE)) return { orders: {}, subscriptions: [], restaurants: [] };
        const data = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(data);
        if (!parsed.subscriptions) parsed.subscriptions = [];
        if (!parsed.restaurants) parsed.restaurants = [];
        return parsed;
    } catch (err) {
        console.error("Error reading DB:", err);
        return { orders: {}, subscriptions: [], restaurants: [] };
    }
}

function writeLocalDb(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error writing DB:", err);
    }
}

// --- SSE Broadcast Helper ---
function broadcastToClients(data) {
    sseClients.forEach(client => {
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

// ==========================================
// 0. RESTAURANT PERSISTENCE & DISCOVERY
// ==========================================

// Get all restaurants (Public API)
app.get('/api/restaurants', (req, res) => {
    const db = readLocalDb();
    res.json(db.restaurants || []);
});

// Create/Update restaurant (Internal/Authenticated path simulated)
app.post('/api/restaurants', (req, res) => {
    const newRest = req.body;
    if (!newRest.id || !newRest.name) return res.status(400).json({ error: 'Invalid data' });

    const db = readLocalDb();
    const existingIdx = db.restaurants.findIndex(r => r.id === newRest.id);
    
    if (existingIdx >= 0) {
        db.restaurants[existingIdx] = { ...db.restaurants[existingIdx], ...newRest };
    } else {
        db.restaurants.push(newRest);
    }

    writeLocalDb(db);
    broadcastToClients({ type: 'RESTAURANT_UPDATE', data: db.restaurants });
    res.json({ success: true, restaurant: newRest });
});

// SSE Endpoint for real-time updates
app.get('/api/restaurants/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now();
    sseClients.push({ id: clientId, res });

    req.on('close', () => {
        sseClients = sseClients.filter(c => c.id !== clientId);
    });
});

// Push Notification Helper
const sendPushNotification = async (filterFn, payload) => {
    const db = readLocalDb();
    const subs = db.subscriptions || [];
    const targets = subs.filter(filterFn);
    const promises = targets.map(sub => {
        return webpush.sendNotification(sub.subscription, JSON.stringify(payload))
            .catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    db.subscriptions = db.subscriptions.filter(s => s.subscription.endpoint !== sub.subscription.endpoint);
                    writeLocalDb(db);
                }
            });
    });
    await Promise.all(promises);
};

// Config & Push Endpoints
app.get('/api/config/vapid', (req, res) => res.json({ publicKey: VAPID_PUBLIC_KEY }));

app.post('/api/push/subscribe', (req, res) => {
    const { subscription, userId, role } = req.body;
    if (!subscription || !userId) return res.status(400).json({ error: 'Missing data' });
    const localDb = readLocalDb();
    const existingIdx = localDb.subscriptions.findIndex(s => s.subscription.endpoint === subscription.endpoint);
    const subRecord = { userId, role, subscription, timestamp: Date.now() };
    if (existingIdx >= 0) localDb.subscriptions[existingIdx] = subRecord;
    else localDb.subscriptions.push(subRecord);
    writeLocalDb(localDb);
    res.json({ success: true });
});

app.post('/api/notify', (req, res) => {
    const { type, payload } = req.body;
    switch (type) {
        case 'new_order':
            sendPushNotification(s => s.role === 'admin' || s.role === 'restaurant', { title: "New Order Received! 🍔", body: `Order #${payload.orderId.slice(0,4)} for ₹${payload.amount}.`, url: '/admin' });
            sendPushNotification(s => s.role === 'delivery', { title: "New Job Opportunity 🛵", body: "An order has been placed nearby.", url: '/delivery' });
            break;
        case 'new_delivery_job':
            sendPushNotification(s => s.role === 'delivery', { title: "Delivery Task Ready! 🛵", body: "You have a new delivery job. Open dashboard to accept.", url: '/delivery' });
            break;
        case 'order_accepted':
            sendPushNotification(s => s.role === 'customer' && s.userId === payload.customerId, { title: "Order Accepted ✅", body: "The restaurant has accepted your order and is preparing it.", url: `/tracking` });
            break;
        case 'out_for_delivery':
            sendPushNotification(s => s.role === 'customer' && s.userId === payload.customerId, { title: "Out for Delivery 🚀", body: "Your food is on the way! Track it now.", url: `/tracking` });
            break;
        case 'delivered':
            sendPushNotification(s => s.role === 'customer' && s.userId === payload.customerId, { title: "Delivered 😋", body: "Your order has arrived. Enjoy your meal!", url: `/profile` });
            break;
    }
    res.json({ success: true });
});

// Order Endpoints
app.get('/api/orders', (req, res) => res.json(Object.values(readLocalDb().orders || {})));
app.get('/api/orders/:orderId', (req, res) => {
    const order = readLocalDb().orders[req.params.orderId];
    order ? res.json(order) : res.status(404).json({ error: "Order not found" });
});

// Serve Static files
app.use(express.static(path.join(__dirname, '../public'))); 
app.use(express.static(path.join(__dirname, '../')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

app.listen(PORT, () => console.log(`CityBite Backend running on port ${PORT}`));
