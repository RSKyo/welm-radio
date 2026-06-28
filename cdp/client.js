import CDP from "chrome-remote-interface";

const defaultHost = "127.0.0.1";
const defaultPort = 9222;

// Map<clientKey, Promise<CDP.Client>>
const clientPromiseMap = new Map();

function getClientKey(targetId, options = {}) {
  const host = options.host ?? defaultHost;
  const port = options.port ?? defaultPort;

  return `${host}:${port}:${targetId}`;
}

async function createClient(targetId, options = {}) {
  const host = options.host ?? defaultHost;
  const port = options.port ?? defaultPort;
  const clientKey = getClientKey(targetId, options);

  const client = await CDP({
    host,
    port,
    target: targetId,
  });

  client.on("disconnect", () => {
    clientPromiseMap.delete(clientKey);
  });

  return client;
}

export async function getClient(targetId, options = {}) {
  const clientKey = getClientKey(targetId, options);

  let clientPromise = clientPromiseMap.get(clientKey);

  if (!clientPromise) {
    clientPromise = createClient(targetId, options);

    clientPromise.catch(() => {
      clientPromiseMap.delete(clientKey);
    });

    clientPromiseMap.set(clientKey, clientPromise);
  }

  return await clientPromise;
}

export async function closeClient(targetId, options = {}) {
  const clientKey = getClientKey(targetId, options);

  const clientPromise = clientPromiseMap.get(clientKey);

  if (!clientPromise) {
    return;
  }

  try {
    const client = await clientPromise;
    await client.close();
  } finally {
    clientPromiseMap.delete(clientKey);
  }
}

export async function closeAllClients() {
  const clientPromises = [...clientPromiseMap.values()];

  clientPromiseMap.clear();

  await Promise.all(
    clientPromises.map((clientPromise) =>
      clientPromise.then((client) => client.close()).catch(() => {}),
    ),
  );
}