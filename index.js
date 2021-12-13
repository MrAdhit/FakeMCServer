const net = require("net");
const fs = require("fs");

const server = net.createServer();

const port = process.env.PORT || 25565;

let icon = "./example.png";

// Read the Icon as base64
icon = fs.readFileSync(icon, {encoding: "base64"});

/*
https://wiki.vg/Server_List_Ping#Response
https://wiki.vg/Protocol_version_numbers#Versions_after_the_Netty_rewrite
*/
const config = {
    "version": {
        "name": "1.8.7",
        "protocol": 47
    },
    "players": {
        "max": 100,
        "online": 5,
        "sample": [
            {
                "name": "MrAdhit",
                "id": "00222178-15ae-4ba7-8816-dd0fcae5382b"
            }
        ]
    },
    "description": {
        "text": "Hello world"
    },
    "favicon": `data:image/png;base64,${icon}`
}

// https://wiki.vg/Chat#Inheritance
const kickMessage = {
    "text": "foo",
    "bold": "true",
    "extra": [
    {
        "text": "bar"
    },
    {
        "text": "baz",
        "bold": "false"
    },
    {
        "text": "qux",
        "bold": "true"
    }]
}

server.on("connection", (socket) => {
    let buffer = Buffer.alloc(0);
    socket.on("data", (data) => {
        buffer = Buffer.concat([buffer, data]);
        const baseBuffer = buffer.slice(buffer.indexOf(0x00) + 1, buffer.length);
        const hostname = (parsePacket.hostname(baseBuffer).length <= 10 ? parsePacket.hostname(baseBuffer).length + 10 : parsePacket.hostname(baseBuffer).length);
        if(buffer.length < hostname && buffer.length > 10) return;
        try {
            const player = parsePacket.player(buffer, baseBuffer);
            const protocol = parsePacket.protocol(baseBuffer);
            const hostname = parsePacket.hostname(baseBuffer);
            const port = parsePacket.port(baseBuffer);
            const state = parsePacket.state(baseBuffer);

            // Perhaps someone can change the logging message? :/
            switch(state){
                case 1:
                    /*
                    Response handshake with server status
                    https://wiki.vg/Server_List_Ping#Handshake
                    */

                    // Changing the protocol to client protocol
                    config.version.protocol = protocol
                    
                    log(`Handshake is initiated with hostname ${hostname} and port ${port}`);

                    socket.write(encode(config));  
                    break;
                case 2:
                    /*
                    Response when client tries to connect
                    https://wiki.vg/Protocol#Disconnect_.28login.29
                    */

                    log(`${player} is trying to connect to ${hostname}:${port}`);

                    socket.write(encode(kickMessage));
                    break;
                default:
                    log(`Responding to ping`);
                    socket.write(buffer);
                    break
            }
            buffer = Buffer.alloc(0);
        } catch (error) {
            console.error(error);
        }
    });
});

function encode(data){
    data = Buffer.from(JSON.stringify(data), "utf-8");
    return Buffer.concat([leb. encode(data.byteLength+ leb.encode(data.byteLength).byteLength + 1), new Buffer.alloc(1), leb.encode(data.byteLength), data]);
}

// https://en.wikipedia.org/wiki/LEB128#JavaScript_code
const leb = {
    encode: (value) => {
        value |= 0;
        const result = [];
        while(true){
            const byte = value & 0x7f;
            value >>= 7;
            if((value === 0 && (byte & 0x40) === 0) || (value === -1 && (byte & 0x40) !== 0)){
                result.push(byte);
                return Buffer.from(result);
            }
            result.push(byte | 0x80);
        }
    },
    decode: (input) => {
        let result = 0;
        let shift = 0;
        while(true){
            const byte = input.shift();
            result |= (byte & 0x7f) << shift;
            shift += 7;
            if((0x80 & byte) === 0){
                if(shift < 32 && (byte & 0x40) !== 0){
                    return result | (~0 << shift);
                }
                return result;
            }
        }
    }
}

// Parse value from response packet
const parsePacket = {
    hostname: (buffer) => {
        let val1 = 3;
        let val2 = (buffer.indexOf(0x00) == -1 ? buffer.length - 3 : buffer.indexOf(0x00) - 4);

        let result = buffer.slice(val1, val2).toString("utf8");

        return result;
    },
    port: (buffer) => {
        let val1 = (buffer.indexOf(0x00) == -1 ? buffer.length - 3 : buffer.indexOf(0x00) - 4);
        let val2 = (buffer.indexOf(0x00) == -1 ? buffer.length - 1 : buffer.indexOf(0x00) - 2);

        let result = buffer.slice(val1, val2).readUInt16BE();

        return result;
    },
    protocol: (buffer) => {
        return leb.decode(Array.prototype.slice.call(buffer.slice(0, 2)));
    },
    player: (rawBuffer, buffer) => {
        if(buffer.indexOf(0x00) == -1) return "";
        let val1 = buffer.indexOf(0x00) + 2;
        let val2 = rawBuffer.length;


        let result = buffer.slice(val1, val2).toString("utf8");

        return result;
    },
    state: (buffer) => {
        let val1 = (buffer.indexOf(0x00) == -1 ? buffer.length - 1 : buffer.indexOf(0x00) - 2);
        let val2 = (buffer.indexOf(0x00) == -1 ? buffer.length : buffer.indexOf(0x00) - 1);

        let result = buffer.slice(val1, val2).readInt8();

        return result;
    }
}

server.listen(port, null, () => {
    log(`Fake Minecraft Server Listening in ${port}`);
});

// Logging stuff
function log(message){
    const date = new Date();
    const prefix = `[${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}] `
    console.log(prefix + message);
}