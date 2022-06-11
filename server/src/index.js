
(async () => {
  const { PORT, server } = await require('./setup')();

  server.listen(PORT)
  server.on('error', serverError);
  server.on('listening', serverOpen);

  function serverError(err) {
    console.log(`error starting server, exiting node process with code 1`, err)
    process.exit(1);
  }

  function serverOpen() {
    console.log('listening @ port', PORT);
  }
})();
