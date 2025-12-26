
# CityBite Payment Integration Project

This module provides a complete solution for UPI Deep Linking and Payment Gateway fallback.

## 1. Setup

### Environment Variables
Add these to your `.env` file:
```env
PORT=3001
MERCHANT_VPA=freemason-aman@fam
MERCHANT_NAME=CityBite
RAZORPAY_SECRET=your_razorpay_webhook_secret
JWT_SECRET=secure_random_string
GOOGLE_MAPS_SERVER_KEY=your_maps_key
```

### Database
The project automatically uses an **In-Memory Map** if no Firebase credentials are provided.
To use Firestore:
1. Set `GOOGLE_APPLICATION_CREDENTIALS` to your service account path.
2. Ensure the `payments` collection exists.

## 2. API Endpoints

### Create Payment
**POST** `/api/payments/create`
```json
{
  "orderId": "ORD-1001",
  "amount": "450.00",
  "currency": "INR"
}
```
**Response:**
```json
{
  "success": true,
  "paymentId": "pay_163...",
  "links": {
    "generic": "upi://pay?pa=...",
    "gpay": "intent://pay?...",
    "web_fallback": "..."
  }
}
```

### Check Status
**GET** `/api/payments/:paymentId/status`

### Webhook
**POST** `/api/payments/webhook`
Headers: `x-razorpay-signature`
Body: Standard Razorpay payload.

## 3. Frontend Flow (Mobile)
1. User clicks "Pay" on Checkout.
2. `pay.js` calls `/create`.
3. If Android, `intent://` links are launched to open GPay/PhonePe directly.
4. App switches context.
5. User pays in UPI app.
6. User switches back.
7. `visibilitychange` event triggers status check.
8. Polling ensures status is updated if webhook arrived.

## 4. Testing
1. **Desktop:** Open `/pay.html`. Click "Pay with Card". Accept simulation prompt. Watch success screen.
2. **Android:** Open `/pay.html`. Click "Google Pay". Check if GPay opens with pre-filled amount.

## 5. Security Notes
- **Idempotency:** Pass `Idempotency-Key` header on create requests to prevent double billing.
- **Signatures:** Webhook signature verification is enforced in production mode.
