(function () {
  function byId(id) {
    return document.getElementById(id);
  }

  var form = byId('admin-user-form');
  var output = byId('admin-user-output');

  if (!form || !output) return;

  function setOutput(message) {
    output.textContent = message;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var action = byId('admin-user-action').value;
    var identifier = byId('admin-user-identifier').value;
    var target = byId('admin-user-target').value.trim();
    var rawData = byId('admin-user-data').value.trim();
    var data;

    if (rawData.length === 0) {
      setOutput('Data is required.');
      return;
    }

    try {
      data = JSON.parse(rawData);
    } catch (err) {
      setOutput('Data must be valid JSON.');
      return;
    }

    if (action === 'update' && target.length === 0) {
      setOutput('Target is required for updates.');
      return;
    }

    var payload = {
      action: action,
      identifier: identifier,
      target: target,
      data: data
    };

    fetch('/admin/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json().then(function (payload) {
        return { status: response.status, payload: payload };
      });
    }).then(function (result) {
      if (result.status >= 200 && result.status < 300) {
        setOutput('Success. User ID: ' + (result.payload.id || 'unknown'));
      } else {
        setOutput('Error: ' + (result.payload.error || 'request_failed'));
      }
    }).catch(function () {
      setOutput('Error: request_failed');
    });
  });
})();
