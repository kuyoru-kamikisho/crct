import 'dart:io';
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:shelf_router/shelf_router.dart';

Response _apiHome(Request request) {
  return Response.ok('Hello, Dart API!');
}

Response _genId(Request request) {
  return Response.ok('This is a GET request.');
}

Future<HttpServer> restRegister({int port = 8080, ip = 'localhost'}) async {
  final router = Router();
  router
    ..get('/', _apiHome)
    ..get('/genId', _genId);

  final handler =
      const Pipeline().addMiddleware(logRequests()).addHandler(router.call);

  final server = await shelf_io.serve(handler, ip, port);
  print('Serving at http://${server.address.host}:${server.port}');

  return server;
}
