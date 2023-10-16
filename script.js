const usageList = document.getElementById('usageList');
const rakingList = document.getElementById('rakingList');
const odorLevel = document.getElementById('odorLevel');

const ctx = document.getElementById('usageChart').getContext('2d');

const usageData = {
    labels: [],
    datasets: [{
        label: 'Usage Time (seconds)',
        data: [],
        borderColor: 'green',
        backgroundColor: 'green',
        pointRadius: 5,
        fill: false
    }]
};

const usageChart = new Chart(ctx, {
  type: 'line',
  data: usageData,
  options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
          x: {
              type: 'time',
              position: 'bottom',
              grid: {
                  drawOnChartArea: false
              },
              ticks: {
                  source: 'data',
                  maxRotation: 45, 
                  minRotation: 45,
                  callback: function(value) {
                      return moment(value).format('HH:mm:ss MMM DD');
                  }
              }
          },
          y: {
              beginAtZero: false,
              title: {
                  display: true,
                  text: 'Usage Time [s]'
              },
              grid: {
                  drawOnChartArea: false
              },
              ticks: {
                  suggestedMax: () => {
                    const max = Math.max(...usageData.datasets[0].data);
                    return max + max * 0.2;
                  },
              }
          }
      },
      elements: {
          point: {
              radius: 5
          },
          line: {
              tension: 0.4
          }
      },
      plugins: {
          legend: {
              display: false
          },
      }
  }
});

function addDataToChart(timestamp, value) {
  // Limit to 10 data points
  if (usageData.labels.length >= 10) {
      usageData.labels.shift();
      usageData.datasets[0].data.shift();
  }
  
  usageData.labels.push(timestamp);
  usageData.datasets[0].data.push(value);

  usageChart.update();
}

function formatDateTime(date) {
  const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

function addUsageMessage(message) {
  const li = document.createElement('li');
  li.classList.add('list-group-item');
  li.textContent = message;
  usageList.prepend(li);

  const seconds = parseFloat(message.split(' ')[2]);
  
  const now = new Date();
  const timestamp = now.getTime();
  
  if (!isNaN(seconds) && isFinite(seconds)) {
      usageData.labels.push(timestamp);
      usageData.datasets[0].data.push(seconds);
      if (usageData.labels.length > 10) {
          usageData.labels.shift();
          usageData.datasets[0].data.shift();
      }
      
      usageChart.update();
  }

  // Keeping only last 10 messages
  while (usageList.children.length > 10) {
      usageList.removeChild(usageList.lastChild);
  }
}

function addRakingMessage(message) {
  const li = document.createElement('li');
  li.classList.add('list-group-item');
  li.textContent = message;
  rakingList.prepend(li);

  // Keeping only last 5 messages
  while (rakingList.children.length > 3) {
    rakingList.removeChild(rakingList.lastChild);
  }
}

function rake() {
  message = new Paho.MQTT.Message("rake");
  message.destinationName = "ece445/rake";
  client.send(message);

  const rakeButton = document.getElementById('rakeButton');
  rakeButton.classList.add('rake-effect');
  
  setTimeout(() => {
      rakeButton.classList.remove('rake-effect');
  }, 900);
}

function updateOdorLevel(level) {
  odorLevel.textContent = level;
}

function onConnect() {
  console.log("onConnect");
  client.subscribe("ece445/rh");
  client.subscribe("ece445/odor");
  client.subscribe("ece445/weight");
}

function onMessageArrived(message) {
  const currentTime = new Date();
  const timeString = currentTime.toLocaleTimeString() + ', ' + currentTime.toDateString();

  if (message.destinationName === "ece445/rh") {
    if (message.payloadString === "manual") {
        addRakingMessage(`${timeString} (manually triggered)`);
    } else if (message.payloadString === "odor") {
        addRakingMessage(`${timeString} (auto triggered by odor)`);
    } else {
        addRakingMessage(`${timeString} (triggered by unknown event)`)
    }
  } else if (message.destinationName === "ece445/odor") {
    updateOdorLevel(`${message.payloadString}`);
  } else if (message.destinationName === "ece445/weight") {
    addUsageMessage(`Used for ${message.payloadString} seconds at ${timeString}`);
  }
}

// Create a client instance
const client = new Paho.MQTT.Client("mqtt.eclipseprojects.io", Number(443), "/mqtt", "LitterBoxController");

// set callback handlers
client.onConnectionLost = (responseObject) => {
  console.log("Connection Lost: "+responseObject.errorMessage);
}

client.onMessageArrived = onMessageArrived;

// connect the client
client.connect({onSuccess: onConnect, useSSL: true});
