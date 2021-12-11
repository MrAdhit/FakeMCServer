const net = require("net");
const leb = require("leb128");
const fs = require("fs");

const server = net.createServer();

// The hostname that you want to use (you can't connect using 127.0.0.1 even though you use localhost as hostname)
const hostname = "localhost";
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
                "name": "thinkofdeath",
                "id": "4566e69f-c907-48ee-8d71-d7ba5aa00d20"
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
    socket.on("data", (data => {
        // Maybe someone can improve this?
        if(!data.toString("utf-8").includes(hostname)){
            /* 
            Response for ping
            https://wiki.vg/Server_List_Ping#Ping
            */
            socket.write(data)
        }else{
            if(data.slice(0, -2)[data.slice(0, -2).length - 1] != 1){
                /*
                Response when client tries to connect
                https://wiki.vg/Protocol#Disconnect_.28login.29
                */
                socket.write(encode(kickMessage));
            }else{
                /*
                Response status handshake
                https://wiki.vg/Server_List_Ping#Handshake
                */
               socket.write(encode(config));
            }
        }
    }));
});

function encode(data){
    data = Buffer.from(JSON.stringify(data), "utf-8");
    return Buffer.concat([leb.signed.encode(data.byteLength + leb.signed.encode(data.byteLength).byteLength + 1), new Buffer.alloc(1), leb.signed.encode(data.byteLength), data]);
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