const express = require('express');
const https = require('https');
const bodyParser = require('body-parser');
const paytmChecksum = require('paytmchecksum');

const app = express();
const port = 3000;

const paytmParams = {
    MID: 'YOUR_MID',
    WEBSITE: 'WEBSTAGING',
    CHANNEL_ID: 'WEB',
    INDUSTRY_TYPE_ID: 'Retail',
    ORDER_ID: 'ORDER_ID',
    CUST_ID: 'CUSTOMER_ID',
    TXN_AMOUNT: 'AMOUNT',
    CALLBACK_URL: 'http://localhost:3000/paytm-callback',
    EMAIL: 'EMAIL',
    MOBILE_NO: 'MOBILE_NUMBER',
    CHECKSUMHASH: ''
};

const paytmConfig = {
    merchantKey: 'YOUR_MERCHANT_KEY',
    salt: 'YOUR_SALT',
    baseUrl: 'https://securegw-stage.paytm.in/theia/processTransaction'
};

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/pay', (req, res) => {
    paytmParams.ORDER_ID = 'ORDER_' + new Date().getTime();
    paytmParams.CUST_ID = 'CUSTOMER_' + new Date().getTime();
    paytmParams.TXN_AMOUNT = req.body.amount;
    paytmParams.EMAIL = req.body.email;
    paytmParams.MOBILE_NO = req.body.mobile;
    paytmParams.CHECKSUMHASH = '';

    generateChecksum(paytmParams, paytmConfig.merchantKey)
        .then(checksum => {
            paytmParams.CHECKSUMHASH = checksum;

            const paytmUrl = `${paytmConfig.baseUrl}?${new URLSearchParams(paytmParams)}`;

            res.redirect(paytmUrl);
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error generating checksum');
        });
});

app.post('/paytm-callback', (req, res) => {
    const checksumHash = req.body.CHECKSUMHASH;
    const txnId = req.body.TXNID;

    verifyChecksum(checksumHash, paytmConfig.merchantKey)
        .then(isValid => {
            if (isValid) {
                const paytmParams = {
                    MID: req.body.MID,
                    ORDER_ID: req.body.ORDERID,
                    TXNID: txnId,
                    TXNAMOUNT: req.body.TXNAMOUNT,
                    STATUS: req.body.STATUS,
                    RESPMSG: req.body.RESPMSG
                };

                // save payment information to database or perform any other actions
                console.log('Payment successful');
            } else {
                console.log('Payment failed');
            }

            res.redirect('/');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error verifying checksum');
        });
});

function generateChecksum(params, merchantKey) {
    return new Promise((resolve, reject) => {
        const paytmChecksum = require('paytmchecksum');

        paytmChecksum.generateSignature(params, merchantKey, (err, checksum) => {
            if (err) {
                reject(err);
            } else {
                resolve(checksum);
            }
        });
    });
}

function verifyChecksum(checksumHash, merchantKey) {
    return new Promise((resolve, reject) => {

        paytmChecksum.verifySignature(paytmParams, merchantKey, checksumHash, (err, isValid) => {
            if (err) {
                reject(err);
            } else {
                resolve(isValid);
            }
        });
    });
}