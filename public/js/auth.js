async function login2(){
  let email = document.getElementById('email');
  let password = document.getElementById('password');

  var http = new XMLHttpRequest();
	http.open("POST", '/login', true);
	http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	http.setRequestHeader("Accept", "application/json");

	http.onreadystatechange = function() {//Call a function when the state changes.
		if(http.readyState == 4 && http.status == 200) {
		var employee = JSON.parse(http.responseText);
				if (employee) {
				}
		}
	}

	var data = {
    'email': email,
    'password': password,
  };
	var params = JSON.stringify(data);
	http.send(params);
}
