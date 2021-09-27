interface Order {
    /**
     * An order sits in the orderbook until it is matched or canceled.
     * It has an id, timestamp, price and initial and remaining quantity.
     * It has pointers to the next and previous order in the limit.
     * It has a pointer to the limit to which it belongs.
     */
    id: number;
    time: number;
    price: number;
    size: number;
    remaining: number;
    next: Order | null;
    prev: Order | null;
    parent: Limit | null;
}

interface Limit {
    is_buy: boolean;
    price: number;
    size: number;
    volume: number;
    next: Limit | null;
    head: Order;
    tail: Order;
}

class Book {
    /**
     * This class models a limit order book for a given instrument.
     */
    private best_bid: Limit | null = null;
    private best_ask: Limit | null = null;
    private bids: Map<number, Limit> = new Map();
    private asks: Map<number, Limit> = new Map();
    private ids: Map<number, Order> = new Map();
    constructor() { }

    private create_limit(is_buy: boolean, initial_order: Order): Limit {
        let price = initial_order.price;
        let limit: Limit = {
            is_buy: is_buy,
            price: price,
            size: 0,
            volume: 0,
            next: null,
            head: initial_order,
            tail: initial_order
        }
        if (is_buy) {
            if (this.best_bid == null) {
                this.best_bid = limit;
            } else if (this.best_bid.price < limit.price) {
                limit.next = this.best_bid;
                this.best_bid = limit;
            } else {
                let curr: Limit = this.best_bid;
                while (curr.next != null && curr.next.price > price) {
                    curr = curr.next;
                }
                limit.next = curr.next;
                curr.next = limit;
            }
            this.bids.set(price, limit);
        } else {
            if (this.best_ask == null) {
                this.best_ask = limit;
            } else if (this.best_ask.price > limit.price) {
                limit.next = this.best_ask;
                this.best_ask = limit;
            } else {
                let curr: Limit = this.best_ask;
                while (curr.next != null && curr.next.price < price) {
                    curr = curr.next;
                }
                limit.next = curr.next;
                curr.next = limit;
            }
            this.asks.set(price, limit)
        }
        return limit;
    }

    private add_order(order_id: number, is_buy: boolean, price: number, size: number, remaining: number): number {
        let order: Order = {
            id: order_id,
            time: Date.now(),
            price: price,
            size: size,
            remaining: remaining,
            next: null,
            prev: null,
            parent: null
        };
        if (is_buy) {
            if (this.bids.has(price)) {
                var limit = <Limit>this.bids.get(price);
            } else {
                var limit = <Limit>this.create_limit(is_buy, order);
            }
        } else {
            if (this.asks.has(price)) {
                var limit = <Limit>this.asks.get(price);
            } else {
                var limit = <Limit>this.create_limit(is_buy, order);
            }
        }
        order.parent = limit;
        order.prev = limit.tail;
        limit.tail.next = order;
        limit.tail = order;
        limit.size++;
        limit.volume += remaining;
        this.ids.set(order_id, order);
        return order.id;
    }

    /**
     * Removes an order from the orderbook.
     * An order can either be in the head, the tail or in the middle of a limit.
     * @param order The order to remove from the orderbook
     */
    private consume_order(order: Order) {
        this.ids.delete(order.id);
        let limit = order.parent;
        if (limit == null) throw new Error("Order parent is null.");
        limit.volume -= order.remaining;
        limit.size--;

        /**
         * If the order is the last order then the limit is removed immediately, otherwise:
         * If the order is at the head, then we just move the head to the next order.
         * If the order is in the tail, then then tail is moved the previous order.
         */
        if (limit.size > 0) {
            if (limit.head == order) {
                if (order.next == null) throw new Error("Order next is null.");
                limit.head = order.next;
            } else if (limit.tail == order) {
                if (order.prev == null) throw new Error("Order prev is null.");
                limit.tail = order.prev;
            } else { // this means that there are to be at least 3 orders in the limit.
                if (order.next == null) throw new Error("Order next is null.");
                if (order.prev == null) throw new Error("Order prev is null.");
                // A B C - B is to be removed
                let A = order.prev;
                let C = order.next;
                A.next = C;
                C.prev = A;
            }
            return limit.head;
        } else {
            // If the limit is empty, then we remove it from the book.
            if (limit.is_buy) {
                this.bids.delete(limit.price);
                if (this.best_bid == limit) {
                    this.best_bid = limit.next;
                }
            } else {
                this.asks.delete(limit.price);
                if (this.best_ask == limit) {
                    this.best_ask = limit.next;
                }
            }
            return null;
        }
    }

    public process_limit_order(order_id: number, is_buy: boolean, price: number, size: number) {
        let remaining = size;
        price = Math.trunc(price * 100);
        if (is_buy) {
            var comp = function (a: number, b: number): boolean { return a <= b; }
            var best_limit = this.best_ask;
        } else {
            var comp = function (a: number, b: number): boolean { return a >= b; }
            var best_limit = this.best_bid;
        }

        if (best_limit == null) {
            this.add_order(order_id, is_buy, price, size, size);
        } else {
            let currLimit: Limit | null = null;
            while (true) {
                currLimit = (is_buy) ? this.best_ask : this.best_bid;
                if (!(currLimit != null && comp(currLimit.price, price))) break;
                let currOrder: Order | null = currLimit.head;

                while (currOrder != null && remaining > 0) {
                    if (currOrder.remaining <= remaining) {
                        /* 
                        If the current order in the book has less quantity than the incoming one,
                        then it shall be removed from the book and the incoming order shall be
                        matched with other ones.
                        */
                        remaining -= currOrder.remaining;
                        currOrder = this.consume_order(currOrder);
                    } else {
                        currOrder.remaining -= remaining;
                        remaining = 0;
                    }
                }
                // If the while loop was exited because of no more orders
                if (currLimit.size == 0) {
                    if (is_buy) {
                        this.asks.delete(currLimit.price);
                        this.best_ask = currLimit.next;
                        currLimit = this.best_ask;
                    } else {
                        this.bids.delete(currLimit.price);
                        this.best_bid = currLimit.next;
                        currLimit = this.best_bid;
                    }
                }

                // If there if no more is needed exit limit-loop
                if (remaining == 0) {
                    break;
                }
            }
            if (remaining > 0) {
                this.add_order(order_id, is_buy, price, size, remaining);
            }
        }
        return order_id;
    }

    process_cancel_order(id: number): boolean {
        let order = this.ids.get(id);
        if (order == undefined) return false;
        this.consume_order(order);
        return true;
    }

    public get_bid(): number { return (this.best_bid == null) ? 0 : this.best_bid.price / 100 }

    public get_ask(): number { return (this.best_ask == null) ? 0 : this.best_ask.price / 100 }

    public ladder(depth: number): string {
        let ret_str = "Bids/asks\nPrice/Volume\n";
        let bid = this.best_bid;
        let ask = this.best_ask;
        for (let i = 0; i < depth; i++) {
            if (bid == null && ask == null) {
                break;
            }
            if (bid != null) {
                ret_str += bid.price / 100 + " " + bid.volume
                bid = bid.next;
            }
            ret_str += "|";
            if (ask != null) {
                ret_str += ask.price / 100 + " " + ask.volume
                ask = ask.next;
            }
            ret_str += "\n";
        }
        return ret_str;
    }

    /**
     * Gets the volume at a specific price.
     * 
     * @param is_buy Bid or ask
     * @param price The price level to query
     * @returns The volume at the price level
     */
    public get_volume(is_buy: boolean, price: number): number {
        price *= 100;
        let ret_val = (is_buy) ? this.bids.get(price) : this.asks.get(price);
        if (ret_val == undefined) return 0;
        else return ret_val.volume;
    }
};

export { Book };