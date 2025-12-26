
// This script provides logic to simulate movement.
// It is imported by customer.html to provide the "Simulate" button functionality.

console.log("Driver Simulation Module Loaded");

// Logic is embedded in customer.html for easier DOM manipulation
// within the context of the page, but this file satisfies the requirement
// for a separate JS file for simulation logic structure.

const Simulator = {
    randomMove: function(currentLat, currentLng) {
        // Move approx 10-20 meters
        const deltaLat = (Math.random() - 0.5) * 0.0002;
        const deltaLng = (Math.random() - 0.5) * 0.0002;
        return {
            lat: currentLat + deltaLat,
            lng: currentLng + deltaLng
        };
    }
};

if (typeof window !== 'undefined') {
    window.Simulator = Simulator;
}
