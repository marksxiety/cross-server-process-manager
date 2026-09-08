module.exports = {
    apps: [{
        name: "xpm-interface",
        namespace: "XPM",
        cwd: __dirname,
        script: "node_modules\\vite\\bin\\vite.js",
        args: ["preview", "--host", "0.0.0.0", "--port", "4173"],

        // Change this path based on where Node.js is installed on the server.
        interpreter: "C:\\Program Files\\nodejs\\node.exe",

        exec_mode: "fork",
        instances: 1,
        autorestart: true,
        max_restarts: 10,
        time: true,
    }],
};