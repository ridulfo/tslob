const { Book } = require("../index.ts")


function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
};

let n = 1e6;
let orderbook = new Book();

let t0 = Date.now()
for (let i = 0; i < 2 * n; i += 2) {
    orderbook.process_limit_order(i, true, getRandomInt(100), getRandomInt(100));
    orderbook.process_limit_order(i + 1, false, getRandomInt(100), getRandomInt(100));
}
let elapsed = (Date.now() - t0) / 1000; // Elapsed time in seconds
let per_sec = n / elapsed;
per_sec = Math.round(per_sec / 1e6 * 100) / 100;
console.log(`${per_sec}M orders per second`)
//console.log(orderbook.ladder(5));
