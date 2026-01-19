const { spawn } = require('child_process');
const path = require('path');

function getSimilarityScore(referencePath, snapshotPath) {
  return new Promise((resolve, reject) => {
    const absRef = path.resolve(referencePath);
    const absSnap = path.resolve(snapshotPath);
    const scriptPath = path.join(__dirname, 'sketch_scorer.py');

    const pythonProcess = spawn('python', [scriptPath, absRef, absSnap]);

    let dataString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.log(`${data}`);
    });

    pythonProcess.on('close', (code) => {
      const score = parseFloat(dataString.trim());
      resolve(isNaN(score) ? 0 : score);
    });
  });
}

module.exports = getSimilarityScore;