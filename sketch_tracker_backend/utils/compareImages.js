const { spawn } = require('child_process');
const path = require('path');

function getSimilarityScore(referencePath, snapshotPath) {
  return new Promise((resolve, reject) => {
    const absRef = path.resolve(referencePath);
    const absSnap = path.resolve(snapshotPath);
    const scriptPath = path.join(__dirname, 'sketch_scorer.py');

    // NOTE: Use 'python3' if on Mac/Linux, 'python' on Windows
    const pythonProcess = spawn('python', [scriptPath, absRef, absSnap]);

    let dataString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    // ... inside the pythonProcess setup ...
    pythonProcess.stderr.on('data', (data) => {
      console.log(`${data}`); // Just print it directly
    });

    pythonProcess.on('close', (code) => {
      const score = parseFloat(dataString.trim());
      // Handle cases where python prints 0 or fails silently
      resolve(isNaN(score) ? 0 : score);
    });
  });
}

module.exports = getSimilarityScore;