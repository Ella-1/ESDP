const express = require("express");
const app = express();
const cors = require("cors");
const { keccak256 } = require("ethereum-cryptography/keccak");
const { utf8ToBytes, toHex } = require("ethereum-cryptography/utils");
const { secp256k1 } = require("ethereum-cryptography/secp256k1");
const port = 3042;

app.use(cors());
app.use(express.json());

const balances = {
  "0357df2fe5fea2835db84ad41e87abe97f9b58bc7bb16fc5ca3b3116862f78b7d1": 100,
  "035140d02d517d62070b8032e146de7edae67ce7cdb24a61ca172485e0fcfcddd6": 50,
  "03b5654a296293bce56b4fd8b6f1b175cc3dce4ffb66b59999f72c580eae317f7b": 75,
};

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

app.post("/send", async (req, res) => {
  const { sender, recipient, amount, signature, recovery } = req.body;

  if (!signature) return res.status(404).send({ message: "Sorry, you didn't provide a signature" });
  if (!recovery) return res.status(404).send({ message: "Sorry, you didn't provide a recovery parameter" });

  try {
    const bytes = utf8ToBytes(JSON.stringify({ sender, recipient, amount }));
    const hash = keccak256(bytes);

    const sig = new Uint8Array(signature);

    const publicKey = await secp256k1.recoverPublicKey(hash, sig, recovery);

    if (toHex(publicKey) !== sender) {
      return res.status(400).send({ message: "Invalid Signature" });
    }

    setInitialBalance(sender);
    setInitialBalance(recipient);

    // Check if the user can transfer funds
    if (balances[sender] < amount) {
      return res.status(400).send({ message: "Sorry, you do not have enough funds" });
    } else {
      balances[sender] -= amount;
      balances[recipient] += amount;
      return res.send({ balance: balances[sender] });
    }
  } catch (error) {
    return res.status(500).send({ message: "An error occurred", error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});

function setInitialBalance(address) {
  if (!balances[address]) {
    balances[address] = 0;
  }
}
