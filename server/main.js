"use strict"

import path from "path";
import fs from "fs";
import fastify from "fastify";
import staticPlugin from "@fastify/static";
import registerSignalingServer from "./rtc/rtc.js";
import { ArgumentParser, SUPPRESS } from "argparse";

const DIRNAME = import.meta.dirname;
const APP_DIR = path.resolve(DIRNAME, "..");

let server;
let args;

function parseArgs() {
    const parser = new ArgumentParser({
        add_help: false, 
    });

    parser.add_argument("--help", {
        action: "help",
        help: "Show this help message and exit",
        default: SUPPRESS
    });
    parser.add_argument("-p", "--port", {
        type: Number,
        required: false,
        help: "Port to listen to",
    });
    parser.add_argument("-h", "--host", {
        type: String,
        required: true,
        help: "Address to listen to"
    });

    args = Object.freeze(parser.parse_args());
}

function registerPlugins() {
    server.register(staticPlugin, {
        root: path.join(APP_DIR, "client"),
        prefix: "/",
        maxAge: 0
    });
}

function registerPages() {
    server.get("/", (_, rep) => {
        rep.sendFile("index.html");
    });
    server.get("/room/:id", (_, rep) => {
        rep.sendFile("room.html");
    });
    server.get("/test", (_, rep) => {
        rep.sendFile("test.html");
    });
}

function start() {
    parseArgs();

    server = fastify({
        http2: true,
        https: {
            cert: fs.readFileSync(path.join(APP_DIR, "ssl", "cert.pem")),
            key: fs.readFileSync(path.join(APP_DIR, "ssl", "key.pem")),
            allowHTTP1: true,
        },
    });

    registerPlugins();
    
    server.register((server) => {
        registerSignalingServer(server);
        registerPages();
    }, { prefix: "/api" });

    server.listen({
        host: args.host,
        port: args.port
    }, (err) => {
        if (err) {
            throw err;
        } else {
            console.log(`Server is running on ${args.host}:${args.port}`);
        }
    });
}

start();

