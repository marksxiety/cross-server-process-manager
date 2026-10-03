'use strict'

// XPM simulation process (Node): just a log loop.
setInterval(() => {
    console.log(`[node-sim] ${new Date().toISOString()} tick`)
}, 2000)
