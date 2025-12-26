
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

// --- VAPID Keys Setup (Auto-generate for demo if missing) ---
// In production, these should be static env vars
let VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
let VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    const vapidKeys = webpush.generateVAPIDKeys();
    VAPID_PUBLIC_KEY = vapidKeys.publicKey;
    VAPID_PRIVATE_KEY = vapidKeys.privateKey;
    console.log("---------------------------------------------------");
    console.log("⚠️  GENERATED NEW VAPID KEYS (DEV MODE) ⚠️");
    console.log("Public:", VAPID_PUBLIC_KEY);
    console.log("Private:", VAPID_PRIVATE_KEY);
    console.log("---------------------------------------------------");
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

// --- Initialize Google Maps ---
const client = new Client({});

// --- Initialize Firebase (Simulated if no creds) ---
let db;
try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
        db = admin.firestore();
    } else {
        console.log("Running with In-Memory DB (No Firebase Creds)");
        // Simple In-Memory Mock for Demo/Dev
        const store = new Map();
        db = {
            collection: (name) => ({
                doc: (id) => ({
                    set: async (data) => store.set(`${name}/${id}`, { ...data, id }),
                    get: async () => ({ exists: store.has(`${name}/${id}`), data: () => store.get(`${name}/${id}`) }),
                    update: async (data) => {
                        const key = `${name}/${id}`;
                        if (!store.has(key)) throw new Error('Not found');
                        store.set(key, { ...store.get(key), ...data });
                    }
                })
            })
        };
    }
} catch (e) { console.error("DB Init Error", e); }

// --- File DB Helper (for simple order tracking) ---
function readLocalDb() {
    try {
        if (!fs.existsSync(DB_FILE)) return { orders: {}, subscriptions: [] };
        const data = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(data);
        if (!parsed.subscriptions) parsed.subscriptions = [];
        return parsed;
    } catch (err) {
        console.error("Error reading DB:", err);
        return { orders: {}, subscriptions: [] };
    }
}

function writeLocalDb(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error writing DB:", err);
    }
}

// --- Push Notification Helper ---
const sendPushNotification = async (filterFn, payload) => {
    const db = readLocalDb();
    const subs = db.subscriptions || [];
    
    const targets = subs.filter(filterFn);
    
    console.log(`[PUSH] Targeting ${targets.length} users with: ${payload.title}`);

    const promises = targets.map(sub => {
        return webpush.sendNotification(sub.subscription, JSON.stringify(payload))
            .catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription expired/invalid, remove it
                    console.log(`[PUSH] Removing invalid subscription for ${sub.userId}`);
                    db.subscriptions = db.subscriptions.filter(s => s.subscription.endpoint !== sub.subscription.endpoint);
                    writeLocalDb(db);
                } else {
                    console.error('[PUSH] Send Error', err);
                }
            });
    });

    await Promise.all(promises);
};

// ==========================================
// 0. CONFIG & PUSH ENDPOINTS
// ==========================================

app.get('/api/config/vapid', (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post('/api/push/subscribe', (req, res) => {
    const { subscription, userId, role } = req.body;
    if (!subscription || !userId) return res.status(400).json({ error: 'Missing data' });

    const localDb = readLocalDb();
    
    // Remove existing sub for this device if strictly duplicate, or append new one
    // Ideally identifying device ID is better, but simple endpoint check works
    const existingIdx = localDb.subscriptions.findIndex(s => s.subscription.endpoint === subscription.endpoint);
    
    const subRecord = {
        userId,
        role, // 'customer', 'restaurant', 'delivery', 'admin'
        subscription,
        timestamp: Date.now()
    };

    if (existingIdx >= 0) {
        localDb.subscriptions[existingIdx] = subRecord; // Update
    } else {
        localDb.subscriptions.push(subRecord);
    }

    writeLocalDb(localDb);
    res.json({ success: true });
    
    // Send welcome push
    webpush.sendNotification(subscription, JSON.stringify({
        title: "Notifications Active",
        body: "You will now receive real-time updates for orders.",
        url: "/"
    })).catch(e => console.error("Welcome push failed", e));
});

// Trigger Notification Manually (for App.tsx events)
app.post('/api/notify', (req, res) => {
    const { type, payload } = req.body;
    
    // Logic to determine recipients based on type
    switch (type) {
        case 'new_order':
            // Notify Admins & Restaurants
            sendPushNotification(
                s => s.role === 'admin' || s.role === 'restaurant',
                {
                    title: "New Order Received! 🍔",
                    body: `Order #${payload.orderId.slice(0,4)} for ₹${payload.amount}.`,
                    url: '/admin'
                }
            );
            // Initial notify for delivery partners
            sendPushNotification(
                s => s.role === 'delivery',
                {
                    title: "New Job Opportunity 🛵",
                    body: "An order has been placed nearby.",
                    url: '/delivery'
                }
            );
            break;

        case 'new_delivery_job':
            // Specific job alert for delivery partners when food is ready
            sendPushNotification(
                s => s.role === 'delivery',
                {
                    title: "Delivery Task Ready! 🛵",
                    body: "You have a new delivery job. Open dashboard to accept.",
                    url: '/delivery'
                }
            );
            break;

        case 'order_accepted':
            // Notify Customer
            sendPushNotification(
                s => s.role === 'customer' && s.userId === payload.customerId,
                {
                    title: "Order Accepted ✅",
                    body: "The restaurant has accepted your order and is preparing it.",
                    url: `/tracking`
                }
            );
            break;

        case 'rider_assigned':
            // Notify Customer
            sendPushNotification(
                s => s.role === 'customer' && s.userId === payload.customerId,
                {
                    title: "Rider Assigned 🏍️",
                    body: `${payload.riderName} is on the way to the restaurant.`,
                    url: `/tracking`
                }
            );
            break;

        case 'out_for_delivery':
            // Notify Customer
            sendPushNotification(
                s => s.role === 'customer' && s.userId === payload.customerId,
                {
                    title: "Out for Delivery 🚀",
                    body: "Your food is on the way! Track it now.",
                    url: `/tracking`
                }
            );
            break;
            
        case 'delivered':
            // Notify Customer
            sendPushNotification(
                s => s.role === 'customer' && s.userId === payload.customerId,
                {
                    title: "Delivered 😋",
                    body: "Your order has arrived. Enjoy your meal!",
                    url: `/profile`
                }
            );
            break;
    }

    res.json({ success: true });
});

// ==========================================
// 1. ORDER ENDPOINTS
// ==========================================

// GET /api/orders - List all orders
app.get('/api/orders', (req, res) => {
    try {
        const localDb = readLocalDb();
        res.json(Object.values(localDb.orders || {}));
    } catch (error) {
        res.status(500).json({ error: error.message || String(error) });
    }
});

// GET /api/orders/:orderId - Get specific order
app.get('/api/orders/:orderId', (req, res) => {
    try {
        const localDb = readLocalDb();
        const order = localDb.orders ? localDb.orders[req.params.orderId] : null;
        if (order) {
            res.json(order);
        } else {
            res.status(404).json({ error: "Order not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message || String(error) });
    }
});

// POST /api/orders/:orderId/accept - Driver Accepts Order
app.post('/api/orders/:orderId/accept', (req, res) => {
    try {
        const { orderId } = req.params;
        const driverId = req.headers['x-driver-id'];

        if (!driverId) return res.status(401).json({ error: "Missing x-driver-id header" });

        const localDb = readLocalDb();
        const order = localDb.orders ? localDb.orders[orderId] : null;

        if (!order) return res.status(404).json({ error: "Order not found" });
        
        order.status = 'accepted';
        order.acceptedBy = driverId;

        writeLocalDb(localDb);
        
        // Trigger Push
        if (order.customerId) {
             sendPushNotification(
                s => s.userId === order.customerId,
                { title: "Driver Assigned", body: "A driver has accepted your order request.", url: '/tracking' }
             );
        }

        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message || String(error) });
    }
});

// POST /api/orders/:orderId/customer-location - Update Location
app.post('/api/orders/:orderId/customer-location', (req, res) => {
    try {
        const { orderId } = req.params;
        const { lat, lng } = req.body;
        
        if (!lat || !lng) return res.status(400).json({ error: "Missing lat/lng" });

        const localDb = readLocalDb();
        const order = localDb.orders ? localDb.orders[orderId] : null;

        if (!order) return res.status(404).json({ error: "Order not found" });

        // Update location in local DB
        order.customerLocation = {
            lat,
            lng,
            bearing: req.body.bearing,
            timestamp: new Date().toISOString()
        };
        
        writeLocalDb(localDb);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message || String(error) });
    }
});

// POST /api/orders/:orderId/location - Driver/System updates location
app.post('/api/orders/:orderId/location', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { lat, lng, bearing, driverId } = req.body;
        if (!lat || !lng) return res.status(400).json({ error: 'Missing coordinates' });

        const localDb = readLocalDb();
        const order = localDb.orders ? localDb.orders[orderId] : null;
        
        // If order exists in local DB, update it there too for the live map
        if (order) {
            order.customerLocation = { lat, lng, bearing, timestamp: new Date().toISOString() };
            writeLocalDb(localDb);
        }

        // Also update Firestore/Memory DB if using advanced features
        const updateData = { lat, lng, bearing, driverId, ts: new Date().toISOString() };
        await db.collection('orders').doc(orderId).update({ location: updateData });
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Location Update Error:', error);
        res.status(500).json({ error: error.message || String(error) });
    }
});


// ==========================================
// 2. PAYMENT ENDPOINTS
// ==========================================

const generateUpiLinks = (txnId, amount, note) => {
    const baseParams = new URLSearchParams({
        pa: MERCHANT_VPA,
        pn: MERCHANT_NAME,
        tr: txnId,
        tn: note,
        am: amount,
        cu: 'INR'
    }).toString();

    const rawUpi = `upi://pay?${baseParams}`;

    return {
        generic: rawUpi,
        gpay: `intent://pay?${baseParams}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`,
        phonepe: `intent://pay?${baseParams}#Intent;scheme=upi;package=com.phonepe.app;end`,
        paytm: `intent://pay?${baseParams}#Intent;scheme=upi;package=net.one97.paytm;end`,
        web_fallback: `/pay.html?orderId=${txnId}`
    };
};

app.post('/api/payments/create', async (req, res) => {
    try {
        const { orderId, amount, currency = 'INR' } = req.body;
        const idempotencyKey = req.headers['idempotency-key'];

        if (!orderId || !amount) return res.status(400).json({ error: 'Missing orderId or amount' });

        if (idempotencyKey) {
            const cached = await db.collection('idempotency').doc(idempotencyKey).get();
            if (cached.exists) return res.json(cached.data());
        }

        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const deepLinks = generateUpiLinks(paymentId, amount, `Order #${orderId}`);
        
        const paymentRecord = {
            paymentId,
            orderId,
            amount,
            currency,
            status: 'pending',
            method: 'upi_intent',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            _links: deepLinks
        };

        await db.collection('payments').doc(paymentId).set(paymentRecord);

        if (idempotencyKey) {
            await db.collection('idempotency').doc(idempotencyKey).set(paymentRecord);
        }

        res.json({
            success: true,
            paymentId,
            amount,
            links: deepLinks,
            fallbackUrl: `/pay.html?mode=card&id=${paymentId}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message || String(error) });
    }
});

app.get('/api/payments/:paymentId/status', async (req, res) => {
    try {
        const { paymentId } = req.params;
        const doc = await db.collection('payments').doc(paymentId).get();
        
        if (!doc.exists) return res.status(404).json({ error: 'Payment not found' });
        
        const data = doc.data();
        res.json({
            paymentId,
            status: data.status,
            amount: data.amount
        });
    } catch (error) {
        res.status(500).json({ error: error.message || String(error) });
    }
});

app.post('/api/payments/webhook', async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const body = JSON.stringify(req.body);

        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_SECRET)
            .update(body)
            .digest('hex');

        if (process.env.NODE_ENV === 'production' && signature !== expectedSignature) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = req.body.event;
        const payload = req.body.payload?.payment?.entity;

        if (payload) {
            const paymentId = payload.notes?.paymentId || payload.description; 
            if (paymentId) {
                const status = event === 'payment.captured' ? 'success' : 'failed';
                await db.collection('payments').doc(paymentId).update({
                    status,
                    pgTransactionId: payload.id,
                    updatedAt: new Date().toISOString()
                });
            }
        }
        res.json({ status: 'ok' });
    } catch (error) {
        res.status(500).json({ error: error.message || String(error) });
    }
});

// ==========================================
// 3. MAPS ENDPOINTS
// ==========================================

app.get('/api/orders/:orderId/route', async (req, res) => {
    try {
        const { originLat, originLng, destLat, destLng } = req.query;
        if (!originLat || !destLat) return res.status(400).json({ error: 'Missing coords' });

        const response = await client.directions({
            params: {
                origin: [originLat, originLng],
                destination: [destLat, destLng],
                mode: 'driving',
                key: process.env.GOOGLE_MAPS_SERVER_KEY
            }
        });
        const route = response.data.routes[0];
        if (!route) return res.status(404).json({ error: 'No route found' });
        
        res.json({
            polyline: route.overview_polyline.points,
            duration_sec: route.legs[0].duration.value,
            distance_m: route.legs[0].distance.value
        });
    } catch (error) {
        console.error('Maps API Error:', error);
        res.status(500).json({ error: error.message || String(error) });
    }
});

// Serve static payment pages from public folder
app.use(express.static(path.join(__dirname, '../public'))); 

// Serve root files (index.html, index.tsx, etc for the React App)
app.use(express.static(path.join(__dirname, '../')));

// Fallback to index.html for React Router
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Export app for testing
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`CityBite Backend running on port ${PORT}`);
    });
}

module.exports = app;
