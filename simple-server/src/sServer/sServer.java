package sServer;

import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;

public class sServer {
  public static void main(String args[]) throws IOException {
    ServerSocket serverSocket = null;
    try {
      serverSocket = new ServerSocket(4444);
    } catch (IOException ex) {
      System.out.println("Can't set up server on this port number. ");
    }
    Socket socket = null;
    InputStream in = null;

    while (true) {
      System.out.println("Waiting...");
      try {
        socket = serverSocket.accept();
        System.out.println("Accepted connection : " + socket);
        try {
          in = socket.getInputStream();
        } catch (IOException ex) {
          System.out.println("Can't get socket input stream. ");
        }
      } catch (IOException ex) {

      }
      File targetFile = new File("/home/stanley/Desktop/Projects/simple-server/results/test.json");
      OutputStream outStream = new FileOutputStream(targetFile);
      int read;
      byte[] bytes = new byte[8*1024];
      while ((read = in.read(bytes)) != -1) {
        outStream.write(bytes, 0, read);
      }
    }
  }
//    serverSocket.close();
}
