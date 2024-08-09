import 'dart:convert';
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf.dart' as shelf;
import 'package:shelf_router/shelf_router.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;

///   ————————————————————————————————————————————————————————————
///   【本文件仅为示例文件，请勿直接在程序中使用该文件内的任何代码】
///   ————————————————————————————————————————————————————————————

class Item {
  String id;
  String name;

  Item(this.id, this.name);

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
      };

  static Item fromJson(Map<String, dynamic> json) {
    return Item(json['id'], json['name']);
  }
}

final Map<String, Item> items = {};

Response _getItem(Request request, String id) {
  final item = items[id];
  if (item != null) {
    return Response.ok(jsonEncode(item.toJson()),
        headers: {'Content-Type': 'application/json'});
  } else {
    return Response.notFound('Item not found');
  }
}

Response _getItems(Request request) {
  final jsonItems = items.values.map((item) => item.toJson()).toList();
  return Response.ok(jsonEncode(jsonItems),
      headers: {'Content-Type': 'application/json'});
}

Future<Response> _postItem(Request request) async {
  final payload = await request.readAsString();
  final data = jsonDecode(payload) as Map<String, dynamic>;
  final item = Item(data['id'], data['name']);
  items[item.id] = item;
  return Response.ok(jsonEncode(item.toJson()),
      headers: {'Content-Type': 'application/json'});
}

Future<Response> _putItem(Request request, String id) async {
  if (!items.containsKey(id)) {
    return Response.notFound('Item not found');
  }
  final payload = await request.readAsString();
  final data = jsonDecode(payload) as Map<String, dynamic>;
  final item = Item(id, data['name']);
  items[id] = item;
  return Response.ok(jsonEncode(item.toJson()),
      headers: {'Content-Type': 'application/json'});
}

Response _deleteItem(Request request, String id) {
  if (items.remove(id) != null) {
    return Response.ok('Item deleted');
  } else {
    return Response.notFound('Item not found');
  }
}

void main() async {
  final router = Router();

  router
    ..get('/items', _getItems)
    ..get('/items/<id>', _getItem)
    ..post('/items', _postItem)
    ..put('/items/<id>', _putItem)
    ..delete('/items/<id>', _deleteItem);

  final handler = const shelf.Pipeline()
      .addMiddleware(shelf.logRequests())
      .addHandler(router);

  final server = await shelf_io.serve(handler, 'localhost', 8080);
  print('Serving at http://${server.address.host}:${server.port}');
}
