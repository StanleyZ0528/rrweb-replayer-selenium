package sWebServer;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Date;

public class sWebServer {
  public static void main(String args[]) throws IOException {
    HttpServer server = HttpServer.create(new InetSocketAddress(8888), 0);
    server.createContext("/", new MyHandler());
    server.setExecutor(null); // creates a default executor
    server.start();
  }
  static class MyHandler implements HttpHandler {
    @Override
    public void handle(HttpExchange t) throws IOException {
      String filePath = "/home/stanley/Desktop/Projects/rrweb-replayer-selenium/simple-server/results/fullSnapshot.json";
      String content = "";
      try {
        content = new String ( Files.readAllBytes( Paths.get(filePath) ) );
      }
      catch (IOException e) {
        e.printStackTrace();
      }
      System.out.println(content);
      String response = content;
      t.sendResponseHeaders(200, response.getBytes().length);
      OutputStream os = t.getResponseBody();
      os.write(response.getBytes());
      os.close();
    }
  }
}
