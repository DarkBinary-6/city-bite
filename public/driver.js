
/**
 * Driver App Logic
 * Handles GPS tracking, API polling, OSRM Routing, and UI updates.
 */

const DriverApp = {
    // Configuration
    config: {
        driverId: 'driver_007', // Hardcoded ID for this session
        pollInterval: 2000,      // Poll customer location every 2s
        osrmUrl: 'https://router.project-osrm.org/route/v1/driving'
    },

    // State
    state: {
        currentOrderId: null,
        driverLocation: null,   // { lat, lng }
        customerLocation: null, // { lat, lng }
        map: null,
        markers: {
            driver: null,
            customer: null
        },
        routeLayer: null,
        watchId: null,
        pollTimer: null
    },

    // --- Initialization ---
    init: function() {
        console.log("Driver App Initialized");
        this.loadOrders();
        
        // Request GPS permission immediately
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.state.driverLocation = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    };
                    console.log("Initial Driver Location:", this.state.driverLocation);
                },
                (err) => console.error("GPS Error:", err)
            );
        }
    },

    // --- API Calls ---
    loadOrders: async function() {
        try {
            const res = await fetch('/api/orders');
            const orders = await res.json();
            const list = document.getElementById('ordersList');
            list.innerHTML = '';

            if (orders.length === 0) {
                list.innerHTML = '<p style="text-align:center; color:#666;">No active orders found.</p>';
                return;
            }

            orders.forEach(order => {
                const el = document.createElement('div');
                el.className = 'order-card';
                
                let btnHtml = '';
                if (order.status === 'placed') {
                    btnHtml = `<button class="btn btn-accept" onclick="DriverApp.acceptOrder('${order.id}')">Accept Order</button>`;
                } else if (order.status === 'accepted' && order.acceptedBy === this.config.driverId) {
                    btnHtml = `<button class="btn btn-resume" onclick="DriverApp.startNavigation('${order.id}')">Resume Navigation</button>`;
                } else {
                    btnHtml = `<span style="color:#999; font-size: 0.9rem;">Status: ${order.status}</span>`;
                }

                el.innerHTML = `
                    <div>
                        <div style="font-weight:bold; font-size:1.1rem;">Order #${order.id.slice(0,6)}</div>
                        <div style="color:#666; font-size:0.9rem;">To: ${order.destination?.lat || '...'}, ${order.destination?.lng || '...'}</div>
                    </div>
                    <div>${btnHtml}</div>
                `;
                list.appendChild(el);
            });
        } catch (e) {
            console.error("Failed to load orders", e);
        }
    },

    acceptOrder: async function(orderId) {
        try {
            const res = await fetch(`/api/orders/${orderId}/accept`, {
                method: 'POST',
                headers: { 'x-driver-id': this.config.driverId }
            });
            if (res.ok) {
                this.loadOrders(); // Refresh list
                this.startNavigation(orderId);
            } else {
                alert("Could not accept order.");
            }
        } catch (e) {
            console.error(e);
            alert("Network error.");
        }
    },

    // --- Navigation System ---
    startNavigation: function(orderId) {
        this.state.currentOrderId = orderId;
        
        // Switch Views
        document.getElementById('dashboardView').style.display = 'none';
        document.getElementById('navigationView').style.display = 'block';

        // Initialize Map
        if (!this.state.map) {
            this.state.map = L.map('map').setView([0, 0], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(this.state.map);
        }
        
        // Invalidate size to ensure map renders correctly after display:block
        setTimeout(() => this.state.map.invalidateSize(), 200);

        // Start Tracking Loops
        this.startGpsTracking();
        this.startCustomerPolling(orderId);
    },

    closeNavigation: function() {
        // Stop Tracking
        if (this.state.watchId) navigator.geolocation.clearWatch(this.state.watchId);
        if (this.state.pollTimer) clearInterval(this.state.pollTimer);
        
        // Reset View
        document.getElementById('dashboardView').style.display = 'block';
        document.getElementById('navigationView').style.display = 'none';
        
        // Refresh orders in case status changed
        this.loadOrders();
    },

    // --- Tracking Logic ---
    startGpsTracking: function() {
        if (!("geolocation" in navigator)) return alert("GPS not supported.");

        this.state.watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                this.state.driverLocation = { lat: latitude, lng: longitude };
                
                this.updateMapMarkers();
                this.recalculateRoute();
                
                // Optional: Send driver location to backend for customer to see
                // fetch(`/api/orders/${this.state.currentOrderId}/driver-location`, ...)
            },
            (err) => console.warn("GPS Error", err),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
    },

    startCustomerPolling: function(orderId) {
        // Immediate fetch
        this.fetchCustomerLocation(orderId);
        
        // Interval fetch
        this.state.pollTimer = setInterval(() => {
            this.fetchCustomerLocation(orderId);
        }, this.config.pollInterval);
    },

    fetchCustomerLocation: async function(orderId) {
        try {
            const res = await fetch(`/api/orders/${orderId}`);
            const order = await res.json();
            
            if (order.customerLocation) {
                // Check if location actually changed to avoid unnecessary re-renders
                const prev = this.state.customerLocation;
                const next = order.customerLocation;
                
                if (!prev || prev.lat !== next.lat || prev.lng !== next.lng) {
                    this.state.customerLocation = next;
                    this.updateMapMarkers();
                    this.recalculateRoute();
                }
            } else {
                // If customer hasn't shared loc yet, use destination from order
                if (order.destination && !this.state.customerLocation) {
                   this.state.customerLocation = order.destination;
                   this.updateMapMarkers();
                   this.recalculateRoute();
                }
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    },

    // --- Map & Routing ---
    updateMapMarkers: function() {
        const { map, driverLocation, customerLocation, markers } = this.state;
        if (!map) return;

        // Update Driver Marker
        if (driverLocation) {
            if (markers.driver) {
                markers.driver.setLatLng([driverLocation.lat, driverLocation.lng]);
            } else {
                // Custom Icon for Driver
                const driverIcon = L.divIcon({
                    className: 'driver-marker',
                    html: '<div style="background:#3b82f6; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>',
                    iconSize: [26, 26]
                });
                markers.driver = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon }).addTo(map);
            }
        }

        // Update Customer Marker
        if (customerLocation) {
            if (markers.customer) {
                markers.customer.setLatLng([customerLocation.lat, customerLocation.lng]);
            } else {
                const custIcon = L.divIcon({
                    className: 'cust-marker',
                    html: '<div style="background:#10b981; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>',
                    iconSize: [26, 26]
                });
                markers.customer = L.marker([customerLocation.lat, customerLocation.lng], { icon: custIcon }).addTo(map);
            }
        }
    },

    recalculateRoute: async function() {
        const { driverLocation, customerLocation } = this.state;
        
        // Need both points to route
        if (!driverLocation || !customerLocation) return;

        // Show loading state if it's the first route
        if (!this.state.routeLayer) document.getElementById('loader').style.display = 'block';

        // OSRM URL: {lng},{lat};{lng},{lat}
        const url = `${this.config.osrmUrl}/${driverLocation.lng},${driverLocation.lat};${customerLocation.lng},${customerLocation.lat}?overview=full&geometries=geojson`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            
            document.getElementById('loader').style.display = 'none';

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                this.drawRoute(route.geometry);
                this.updateNavPanel(route.distance, route.duration);
                this.updateDeepLinks(driverLocation, customerLocation);
            }
        } catch (e) {
            console.error("OSRM Routing Error", e);
            document.getElementById('loader').style.display = 'none';
        }
    },

    drawRoute: function(geometry) {
        if (this.state.routeLayer) {
            this.state.map.removeLayer(this.state.routeLayer);
        }

        // Draw Polyline
        this.state.routeLayer = L.geoJSON(geometry, {
            style: {
                color: '#3b82f6',
                weight: 6,
                opacity: 0.8
            }
        }).addTo(this.state.map);

        // Fit map to show full route
        this.state.map.fitBounds(this.state.routeLayer.getBounds(), { padding: [50, 50] });
    },

    updateNavPanel: function(distMeters, durationSeconds) {
        // Convert to nice strings
        const km = (distMeters / 1000).toFixed(1);
        const mins = Math.ceil(durationSeconds / 60);

        document.getElementById('uiDist').innerText = km;
        document.getElementById('uiEta').innerText = mins;
    },

    updateDeepLinks: function(driver, customer) {
        const gMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${driver.lat},${driver.lng}&destination=${customer.lat},${customer.lng}&travelmode=driving`;
        const wazeUrl = `https://waze.com/ul?ll=${customer.lat},${customer.lng}&navigate=yes`;

        document.getElementById('linkGoogle').href = gMapsUrl;
        document.getElementById('linkWaze').href = wazeUrl;
    },

    completeDelivery: function() {
        // Placeholder for complete logic
        if(confirm("Mark order as delivered?")) {
            // API call would go here
            alert("Order Delivered!");
            this.closeNavigation();
        }
    }
};

// Start App
DriverApp.init();
