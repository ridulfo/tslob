const {Book} = require("../index.ts")
const test = require('ava');

test('test_initialize', function (t: any) {
	let orderbook = new Book();
	t.is(orderbook.get_bid(), 0);
	t.is(orderbook.get_ask(), 0);
});
test('test_insert', function (t: any) {
	let orderbook = new Book();
	orderbook.process_limit_order(true, 100, 10);
	orderbook.process_limit_order(true, 100, 10);
	orderbook.process_limit_order(true, 100, 10);
	orderbook.process_limit_order(false, 110, 10);
	t.is(orderbook.get_bid(), 100);
	t.is(orderbook.get_ask(), 110);
	t.is(orderbook.get_volume(true, 100), 30);
	t.is(orderbook.get_volume(false, 110), 10);
});
test('test_insert_many', function (t: any) {
	let orderbook = new Book();
	let mid = 100;
	for(let i = 0; i < 50; i++) {
		orderbook.process_limit_order(true, mid-i, 10);
		orderbook.process_limit_order(false, mid+i, 10);
	}
	for(let i = 1; i < 50; i++) {
		t.is(orderbook.get_volume(true, mid-i), 10);
		t.is(orderbook.get_volume(false, mid+i), 10);
	}

	t.is(orderbook.get_bid(), 99);
	t.is(orderbook.get_ask(), 101);
});
test('test_execution_same', function (t: any) {
	let orderbook = new Book();
	orderbook.process_limit_order(true, 10, 10);
	orderbook.process_limit_order(false, 10, 10);
	t.is(orderbook.get_bid(), 0);
	t.is(orderbook.get_ask(), 0);
});
test('test_execution_different1', function (t: any) {
	let orderbook = new Book();
	orderbook.process_limit_order(true, 10, 10);
	orderbook.process_limit_order(false, 9, 10);
	t.is(orderbook.get_bid(), 0);
	t.is(orderbook.get_ask(), 0);
});
test('test_execution_different2', function (t: any) {
	let orderbook = new Book();
	orderbook.process_limit_order(true, 10, 10);
	orderbook.process_limit_order(false, 9, 11);
	t.is(orderbook.get_bid(), 0);
	t.is(orderbook.get_ask(), 9);
	t.is(orderbook.get_volume(false, 9), 1);
});
test('test_execution_marmoorli', function (t: any) {
	let orderbook = new Book();
	orderbook.process_limit_order(false, 10, 5);
	orderbook.process_limit_order(false, 11, 5);
	orderbook.process_limit_order(true, 10, 1);
	t.is(orderbook.get_bid(), 0);
	t.is(orderbook.get_ask(), 10);
});

test('test_execution_non_exhaustive', function (t: any) {
	let orderbook = new Book();
	orderbook.process_limit_order(false, 10, 5);
	orderbook.process_limit_order(true, 10, 6);
	t.is(orderbook.get_bid(), 10);
	t.is(orderbook.get_ask(), 0);
	t.is(orderbook.get_volume(true, 10), 1);
});
test('test_cancel1', function (t: any) {
	let orderbook = new Book();
	let id = orderbook.process_limit_order(true, 10, 5);
	t.is(orderbook.get_bid(), 10);
	t.is(orderbook.get_volume(true, 10), 5);
	orderbook.process_cancel_order(id);
	t.is(orderbook.get_bid(), 0);
	t.is(orderbook.get_volume(true, 10), 0);
});
test('test_cancel2', function (t: any) {
	let orderbook = new Book();
	let id = orderbook.process_limit_order(true, 11, 5);
	orderbook.process_limit_order(true, 10, 5);
	t.is(orderbook.get_bid(), 11);
	t.is(orderbook.get_volume(true, 11), 5);
	t.is(orderbook.get_volume(true, 10), 5);
	orderbook.process_cancel_order(id);
	t.is(orderbook.get_bid(), 10);
	t.is(orderbook.get_volume(true, 11), 0);
	t.is(orderbook.get_volume(true, 10), 5);
});