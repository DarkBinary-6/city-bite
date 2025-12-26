
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// --- DB Helpers ---
function readDb() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading DB:", err);
        return { orders: {} };
    }
}

function writeDb(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error writing DB:", err);
    }
}

// --- API Endpoints ---

// GET /api/orders - List all orders
app.get('/api/orders', (req, res) => {
    const db = readDb();
    res.json(Object.values(db.orders));
});

// GET /api/orders/:orderId - Get specific order
app.get('/api/orders/:orderId', (req, res) => {
    const db = readDb();
    const order = db.orders[req.params.orderId];
    if (order) {
        res.json(order);
    } else {
        res.status(404).json({ error: "Order not found" });
    }
});

// POST /api/orders/:orderId/customer-location - Update Location
app.post('/api/orders/:orderId/customer-location', (req, res) => {
    const { orderId } = req.params;
    const { lat, lng } = req.body;
    const userId = req.headers['x-user-id'];

    if (!userId) return res.status(401).json({ error: "Missing x-user-id header" });
    if (!lat || !lng) return res.status(400).json({ error: "Missing lat/lng" });

    const db = readDb();
    const order = db.orders[orderId];

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Note: Allowing 'accepted' status as well so the simulation works in real-time for the driver
    if (order.status !== 'placed' && order.status !== 'accepted') {
        return res.status(400).json({ error: "Order is not active" });
    }

    order.customerLocation = {
        lat,
        lng,
        timestamp: new Date().toISOString()
    };

    writeDb(db);
    res.json({ ok: true });
});

// POST /api/orders/:orderId/accept - Driver Accepts Order
app.post('/api/orders/:orderId/accept', (req, res) => {
    const { orderId } = req.params;
    const driverId = req.headers['x-driver-id'];

    if (!driverId) return res.status(401).json({ error: "Missing x-driver-id header" });

    const db = readDb();
    const order = db.orders[orderId];

    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== 'placed') return res.status(400).json({ error: "Order already accepted or invalid" });

    order.status = 'accepted';
    order.acceptedBy = driverId;

    writeDb(db);
    res.json({ ok: true });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`- Customer View: http://localhost:${PORT}/customer.html`);
    console.log(`- Driver View:   http://localhost:${PORT}/driver.html`);
});
