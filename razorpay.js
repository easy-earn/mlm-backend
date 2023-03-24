const express = require('express');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());

// Initialize Razorpay client with your API credentials
const razorpay = new Razorpay({
    key_id: 'rzp_test_lVhip8nK282gAP',
    key_secret: 'YOUR_KEY_SECRET'
});

// Endpoint to initialize payment transaction
app.post('/payment', async (req, res) => {
    const { amount, planId } = req.body;

    // Create a new order object
    const order = await razorpay.orders.create({
        amount,
        currency: 'INR',
        payment_capture: 1,
        receipt: 'order_receipt',
        notes: {
            planId
        }
    });

    // Return the order ID and other details to the client
    res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
    });
});

// Endpoint to handle payment completion webhook from Razorpay
app.post('/payment-done-webhook', (req, res) => {
    const { body } = req;

    // Verify the signature of the webhook event
    const signature = crypto.createHmac('sha256', 'YOUR_WEBHOOK_SECRET')
        .update(JSON.stringify(body))
        .digest('hex');

    if (signature !== req.headers['x-razorpay-signature']) {
        return res.status(400).send('Invalid signature');
    }

    // Handle the payment completion event
    const { payment_id, order_id, amount } = body.payload.payment.entity;

    // TODO: Update your database or perform any other actions required

    res.send('Payment completed');
});

// Endpoint to handle withdrawal requests
app.post('/withdrawal-request', async (req, res) => {
    const { amount, accountNumber, ifscCode } = req.body;

    // Create a new transfer object
    const transfer = await razorpay.transfers.create({
        amount,
        currency: 'INR',
        account: {
            account_number: accountNumber,
            ifsc: ifscCode,
            name: 'Account holder name'
        },
        on_hold: 1,
        notes: {
            withdrawal_request_id: 'YOUR_WITHDRAWAL_REQUEST_ID'
        }
    });

    // Return the transfer ID and other details to the client
    res.json({
        transferId: transfer.id,
        amount: transfer.amount,
        currency: transfer.currency
    });
});

