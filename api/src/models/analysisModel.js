const fs = require('fs');
const csv = require('csv-parser');
const readline = require('readline');

// Helper function to parse CSV telemetry data
const parseTelemetryData = (filePath) => {
  return new Promise((resolve, reject) => {
    const metadata = {};
    const telemetryData = [];
    
    // First, read the file line by line to understand its structure
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const lines = [];
    rl.on('line', (line) => {
      lines.push(line);
    });

    rl.on('close', () => {
      try {
        console.log(`Total lines in file: ${lines.length}`);
        
        // Extract metadata from first lines
        for (let i = 0; i < Math.min(13, lines.length); i++) {
          const parts = lines[i].split(',');
          if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
            metadata[parts[0].trim()] = parts[1].trim();
          }
        }

        // Find the header line (contains "Time" as first column)
        let headerLineIndex = -1;
        let headerColumns = [];
        for (let i = 13; i < Math.min(20, lines.length); i++) {
          if (lines[i].includes('Time,')) {
            headerLineIndex = i;
            headerColumns = lines[i].split(',').map(col => col.trim());
            console.log(`Found headers at line ${i + 1}:`, headerColumns.slice(0, 5));
            break;
          }
        }

        if (headerLineIndex === -1) {
          throw new Error('Could not find header line with Time column');
        }

        // Skip the units line (next line after headers)
        const dataStartLine = headerLineIndex + 2;
        console.log(`Data starts at line ${dataStartLine + 1}`);

        // Parse data lines
        for (let i = dataStartLine; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line && !line.startsWith(',')) { // Skip empty lines and lines that start with comma
            const values = line.split(',');
            
            if (values.length >= headerColumns.length - 5) { // Allow some missing columns
              const dataPoint = {};
              headerColumns.forEach((header, index) => {
                if (header && values[index] !== undefined) {
                  dataPoint[header] = values[index].trim();
                }
              });
              
              // Only add data points with valid Time values
              if (dataPoint.Time && !isNaN(parseFloat(dataPoint.Time))) {
                telemetryData.push(dataPoint);
              }
            }
          }
        }

        console.log(`Parsed ${telemetryData.length} data points`);
        if (telemetryData.length > 0) {
          console.log('First data point:', telemetryData[0]);
          console.log('Available columns:', Object.keys(telemetryData[0]));
        }

        resolve({ metadata, telemetryData });
      } catch (error) {
        console.error('Error processing CSV:', error);
        reject(error);
      }
    });

    rl.on('error', reject);
  });
};

// Helper function to extract fastest lap
const extractFastestLap = (telemetryData) => {
  if (!telemetryData || telemetryData.length === 0) {
    console.log('No telemetry data provided');
    return null;
  }

  console.log(`Processing ${telemetryData.length} data points for fastest lap extraction`);

  // First, try to find lap boundaries based on distance reset
  const laps = [];
  let currentLap = [];
  let previousDistance = 0;
  let maxDistance = 0;

  // Find the maximum distance to understand the track length
  telemetryData.forEach(point => {
    const distance = parseFloat(point['Distance on Vehicle Speed'] || point['Distance on GPS Speed'] || 0);
    maxDistance = Math.max(maxDistance, distance);
  });

  console.log(`Maximum distance in session: ${maxDistance}m`);

  telemetryData.forEach((point, index) => {
    const distance = parseFloat(point['Distance on Vehicle Speed'] || point['Distance on GPS Speed'] || 0);
    
    // New lap detected if distance resets significantly (more than 1000m drop)
    if (distance < previousDistance - 1000 && currentLap.length > 200) {
      console.log(`Lap detected: ${currentLap.length} points, distance reset from ${previousDistance} to ${distance}`);
      laps.push([...currentLap]);
      currentLap = [point];
    } else {
      currentLap.push(point);
    }
    
    previousDistance = distance;
  });

  // Add the last lap if it's substantial
  if (currentLap.length > 200) {
    console.log(`Final segment: ${currentLap.length} points`);
    laps.push(currentLap);
  }

  console.log(`Found ${laps.length} laps/segments`);

  // If we found clear laps, find the fastest one
  if (laps.length > 1) {
    let fastestLap = null;
    let fastestTime = Infinity;

    laps.forEach((lap, lapIndex) => {
      if (lap.length > 100) {
        const startTime = parseFloat(lap[0].Time || 0);
        const endTime = parseFloat(lap[lap.length - 1].Time || 0);
        const lapTime = endTime - startTime;

        console.log(`Lap ${lapIndex + 1}: ${lapTime.toFixed(2)}s (${lap.length} points)`);

        // Look for lap times between 30-300 seconds (broader range for sessions)
        if (lapTime >= 30 && lapTime <= 300 && lapTime < fastestTime) {
          fastestTime = lapTime;
          fastestLap = lap;
          console.log(`New fastest lap: ${fastestTime.toFixed(2)}s`);
        }
      }
    });

    if (fastestLap) {
      console.log(`Fastest lap found: ${fastestTime.toFixed(2)}s with ${fastestLap.length} data points`);
      return fastestLap;
    }
  }

  // If no clear laps found, extract a representative segment from the session
  console.log('No clear laps detected, extracting representative session segment');
  
  // Find a good section of the session (middle portion with consistent speed)
  const sessionLength = telemetryData.length;
  
  // Look for a section where the car is moving consistently (speed > 10 km/h)
  let bestSegmentStart = 0;
  let bestSegmentLength = 0;
  
  for (let i = Math.floor(sessionLength * 0.1); i < Math.floor(sessionLength * 0.8); i += 100) {
    let segmentLength = 0;
    for (let j = i; j < Math.min(i + 2000, sessionLength); j++) {
      const speed = parseFloat(telemetryData[j].Speed || 0);
      if (speed > 10) { // Car is moving
        segmentLength++;
      } else {
        break;
      }
    }
    
    if (segmentLength > bestSegmentLength) {
      bestSegmentLength = segmentLength;
      bestSegmentStart = i;
    }
  }

  if (bestSegmentLength > 500) {
    const segment = telemetryData.slice(bestSegmentStart, bestSegmentStart + bestSegmentLength);
    const segmentTime = parseFloat(segment[segment.length - 1].Time) - parseFloat(segment[0].Time);
    console.log(`Selected session segment: ${segmentTime.toFixed(2)}s with ${segment.length} data points`);
    console.log(`Segment starts at ${segment[0].Time}s, ends at ${segment[segment.length - 1].Time}s`);
    return segment;
  }

  // Final fallback - just take a portion of the session
  const fallbackStart = Math.floor(sessionLength * 0.3);
  const fallbackEnd = Math.min(fallbackStart + 1000, sessionLength);
  
  if (fallbackEnd - fallbackStart > 100) {
    const fallbackSegment = telemetryData.slice(fallbackStart, fallbackEnd);
    const fallbackTime = parseFloat(fallbackSegment[fallbackSegment.length - 1].Time) - parseFloat(fallbackSegment[0].Time);
    console.log(`Using fallback segment: ${fallbackTime.toFixed(2)}s with ${fallbackSegment.length} data points`);
    return fallbackSegment;
  }

  console.log('Could not extract any valid segment from the session');
  return null;
};

module.exports = {
  parseTelemetryData,
  extractFastestLap
}; 