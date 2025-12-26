
// Frontend Payment Logic
const Payment = {
    paymentId: null,
    amount: 0,
    links: null,
    pollInterval: null,
    isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),

    // 1. Initialization
    init: async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('orderId') || 'ORD-' + Math.floor(Math.random() * 10000);
        const amount = urlParams.get('amount') || '450.00';

        const amtDisplay = document.getElementById('amount-display');
        const orderRef = document.getElementById('order-ref');
        if (amtDisplay) amtDisplay.innerText = amount;
        if (orderRef) orderRef.innerText = `Order ID: ${orderId}`;
        
        try {
            const res = await fetch('/api/payments/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, amount, currency: 'INR' })
            });
            const data = await res.json();
            
            if (data.success) {
                Payment.paymentId = data.paymentId;
                Payment.amount = data.amount;
                Payment.links = data.links;
            }
        } catch (e) {
            console.error('Payment Init Error:', e);
        }
    },

    // 2. Pay Logic (Safe Intent Launch)
    pay: (appType) => {
        if (!Payment.links) return;

        Payment.toggleView('processing');

        let url = Payment.links.generic;
        
        if (/Android/i.test(navigator.userAgent)) {
            if (appType === 'gpay') url = Payment.links.gpay;
            if (appType === 'phonepe') url = Payment.links.phonepe;
            if (appType === 'paytm') url = Payment.links.paytm;
        } 

        // CRITICAL FIX: Removed window.location.href and window.open(url, '_self')
        // We now use _blank for intent handling if allowed, or just poll.
        // In preview environments, navigating the frame is what causes SecurityErrors.
        try {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Navigation blocked by environment", e);
        }

        Payment.startPolling();
    },

    // 3. Status Polling
    startPolling: () => {
        if (Payment.pollInterval) clearInterval(Payment.pollInterval);
        
        Payment.pollInterval = setInterval(async () => {
            try {
                if (!Payment.paymentId) return;
                const res = await fetch(`/api/payments/${Payment.paymentId}/status`);
                const data = await res.json();
                
               if (data.status === 'success') {
    clearInterval(Payment.pollInterval);
    Payment.toggleView('success');

    try {
        const placeOrderRes = await fetch('/api/orders/place-after-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                paymentId: Payment.paymentId,
                amount: Payment.amount,
                cartId: localStorage.getItem('cartId')
            })
        });

        const orderData = await placeOrderRes.json();

        if (orderData.success) {
            window.location.href =
              `/checkout?orderId=${orderData.orderId}&paid=true`;
        } else {
            alert("Payment succeeded but order creation failed. Contact support.");
        }

    } catch (err) {
        console.error("Order placement failed", err);
        alert("Payment succeeded but order could not be placed.");
    }
}

    // 4. Fallback Flow
    startFallbackFlow: () => {
        const confirm = window.confirm("Simulating Secure Payment: Click OK to Succeed");
        if(confirm) {
            fetch('/api/payments/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'payment.captured',
                    payload: { payment: { entity: { id: "pay_sim_" + Date.now(), description: Payment.paymentId } } }
                })
            }).then(() => Payment.startPolling());
            Payment.toggleView('processing');
        }
    },

    toggleView: (viewName) => {
        const opts = document.getElementById('payment-options');
        const proc = document.getElementById('processing-view');
        const succ = document.getElementById('success-view');

        if (opts) opts.classList.add('hidden');
        if (proc) proc.classList.add('hidden');
        if (succ) succ.classList.add('hidden');

        if (viewName === 'options' && opts) opts.classList.remove('hidden');
        if (viewName === 'processing' && proc) proc.classList.remove('hidden');
        if (viewName === 'success' && succ) succ.classList.remove('hidden');
    },

    reset: () => {
        Payment.toggleView('options');
        if (Payment.pollInterval) clearInterval(Payment.pollInterval);
    }
};

Payment.init();
