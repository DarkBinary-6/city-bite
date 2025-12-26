/**
 * Simulated Payment Gateway Handler
 */
export const initiateFullRefund = async (paymentId: string, amount: number) => {
    try {
        // Mocking payment gateway refund API (e.g., Razorpay/Stripe)
        // Logic: Return a unique refund ID and success status
        console.log(`[PG] Initiating refund for Payment ID: ${paymentId}, Amount: ₹${amount}`);
        
        return {
            id: `ref_${Math.random().toString(36).substr(2, 9)}`,
            status: 'processed',
            amount: amount,
            currency: 'INR',
            processedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('[PG] Gateway Refund Error:', error);
        throw error;
    }
};