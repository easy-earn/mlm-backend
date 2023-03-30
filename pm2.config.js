module.exports = {
    apps: [{
        name: "mlm-backend",
        script: "./src/app.js",
        node_args: '-r dotenv/config',
    }]
}