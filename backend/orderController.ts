import { initiateFullRefund } from './paymentHandler';
import { notifyRefundInitiated } from './notificationService';

/**
 * Controller to handle Order Rejection and Refunds
 */
export const handleOrderRejection = async (orderId: string, localDb: any, writeDbFn: (db: any) => void) => {
    const order = localDb.orders[orderId];
    if (!order) {
        throw new Error('Order not found');
    }

    // 1. Handle COD Orders
    if (order.paymentMethod === 'COD') {
        order.status = 'cancelled';
        writeDbFn(localDb);
        return { status: 'cancelled', refund: 'SKIPPED_COD' };
    }

    // 2. Handle Paid Online Orders
    order.status = 'rejected';

    if (order.paymentStatus === 'PAID') {
    try {

        // ✅ SAFETY CHECK — MUST BE BEFORE refund call
        if (order.paymentStatus === 'REFUND_INITIATED') {
            return { status: 'rejected', refund: 'ALREADY_INITIATED' };
        }

        // Initiate full refund
        const refundResponse = await initiateFullRefund(
            order.paymentId,
            order.total
        );
            
            // On success: Save refund details and update status
            order.refundId = refundResponse.id;
            order.paymentStatus = 'REFUND_INITIATED';
            order.refundReason = 'Order rejected by restaurant';
            
            // Notify customer
            await notifyRefundInitiated(order.customerId, order.total);
            
            writeDbFn(localDb);
            return { status: 'rejected', refund: 'INITIATED', refundId: order.refundId };
            
        } catch (error) {
            // Failure handling: Log and mark failed, do not retry automatically
            console.error(`[OrderController] Refund Failed for Order ${orderId}:`, error);
            order.paymentStatus = 'REFUND_FAILED';
            writeDbFn(localDb);
            return { status: 'rejected', refund: 'FAILED' };
        }
    } else {
        // Order not yet paid or already processed
        writeDbFn(localDb);
        return { status: 'rejected', refund: 'SKIPPED_UNPAID' };
    }
};