
# Local Delivery Tracker

A complete real-time delivery tracking demo using Node.js, Express, and Leaflet Maps.

## 🚀 How to Run

1. **Install Dependencies**
   ```bash
   npm install
   ```
   *(This installs express, body-parser, and cors)*

2. **Start the Server**
   ```bash
   node server.js
   ```
   The server will start at `http://localhost:3000`.

3. **Open the Customer App**
   - Go to `http://localhost:3000/customer.html`
   - You will see Order #order123 with status **PLACED**.
   - Click **"Share My Location"** to send your real browser location once.
   - Or click **"🏃 Simulate Movement"** to start sending fake moving coordinates to the server every 2 seconds.

4. **Open the Driver App**
   - Open a new tab at `http://localhost:3000/driver.html`
   - You will see the order in the list.
   - Click **"Accept Order"**.
   - A map will appear. It polls the server every 2 seconds.
   - If you left the simulation running in the Customer tab, you will see the marker move on the Driver's map in real-time!

## 🛠 Tech Details
- **Backend**: Express.js with a local `db.json` file.
- **Frontend**: Vanilla JS with Leaflet.js for maps (OpenStreetMap tiles).
- **Auth**: Simple header checks (`x-user-id`, `x-driver-id`) for demo purposes.

## 📝 Notes
- To reset the data, stop the server and discard changes to `db.json` (or paste the original content back).
- The "Simulate Movement" feature in the Customer view updates the backend, which the Driver view then fetches.
