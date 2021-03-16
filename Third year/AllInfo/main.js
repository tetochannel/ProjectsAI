const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const forecastDays = 6
const localStorage = window.localStorage
const modes = [ip_mode, getPos]
const levels = ['Region', 'Municipality', 'Locality']
let interval
let secondsObserver
let minutesObserver
let hoursObserver
let map
let dt
let tz
let utc

function setWeather(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&units=metric&appid=67a731f2ef16c0f99030c31cf727e185`)
    .then((r) => r.json())
    .then((b) => {
      document.getElementById("current-weather").src = "https://openweathermap.org/img/wn/" + b.current.weather[0].icon + "@4x.png"
      document.getElementById("current-description").innerText = b.current.weather[0].description.charAt(0).toUpperCase() +
      b.current.weather[0].description.substring(1, b.current.weather[0].description.length)
      document.getElementById("current-temp").innerText = Math.ceil(b.current.temp) + " °C"
      for (let i = 0; i < forecastDays; i++) {
        let m = dt.getMonth()
        let y = (new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate())
        let ny = dt.getDate() + 1 + i
        if (ny > y)
          {ny = (ny % y); m = (m + 1) % 12}
        document.getElementById(`next-day-${i}`).innerText = days[(dt.getDay() + 1 + i) % days.length].substr(0, 3) +
            " " + ny + " " + months[m].substr(0, 3)
        document.getElementById(`next-weather-${i}`).src = "https://openweathermap.org/img/wn/" + b.daily[i].weather[0].icon + "@2x.png"
        document.getElementById(`next-description-${i}`).innerText =
          b.daily[i].weather[0].description.charAt(0).toUpperCase() +
          b.daily[i].weather[0].description.substring(1, b.daily[i].weather[0].description.length)
        document.getElementById(`next-max-temp-${i}`).innerText = Math.ceil(b.daily[i].temp.max) + "°C"
        document.getElementById(`next-felt-temp-${i}`).innerText = Math.floor(b.daily[i].feels_like.day) + "°C"
      }
    });
}

function pad(number, length) {
  let str = number
  while (String(str).length < length) 
    str = "0" + str
  return str
}

function setTime(lat, lon) {
  document.getElementById("current-timezone").innerText = tz
  document.getElementById("current-GMT").innerText = utc
  document.getElementById("current-seconds").innerText = pad(dt.getSeconds(), 2)
  document.getElementById("current-minutes").innerText = pad(dt.getMinutes(), 2)
  document.getElementById("current-hours").innerText = pad(dt.getHours(), 2)
  document.getElementById("current-date").innerText = 
    days[dt.getDay()] + " " + dt.getDate() + " " + months[dt.getMonth()] + " " + dt.getFullYear()
  if (typeof secondsObserver !== "undefined" && typeof minutesObserver !== "undefined" && typeof hoursObserver !== "undefined")
  {
    secondsObserver.disconnect()
    minutesObserver.disconnect()
    hoursObserver.disconnect()
  }
  secondsObserver = new MutationObserver(() => {
    if (dt.getSeconds() === 0)
      document.getElementById("current-minutes").innerText = pad(dt.getMinutes(), 2)
  })
  secondsObserver.observe(document.getElementById("current-seconds"), {childList: true})
  minutesObserver = new MutationObserver(() => {
    map.invalidateSize()
    setWeather(lat, lon)
    if (dt.getMinutes() === 0)
      document.getElementById("current-hours").innerText = pad(dt.getHours(), 2)
  })
  minutesObserver.observe(document.getElementById("current-minutes"), {childList: true})
  hoursObserver = new MutationObserver(() => {
    if (dt.getHours() === 0)
      document.getElementById("current-date").innerText = 
        days[dt.getDay()] + " " + dt.getDate() + " " + months[dt.getMonth()] + " " + dt.getFullYear()
  })
  hoursObserver.observe(document.getElementById("current-hours"), {childList: true})
}

async function setAll(res, ip) {
  setMap(res, ip);
  setTime(res.latitude, res.longitude)
  setWeather(res.latitude, res.longitude)
  clearInterval(interval)
  interval = setInterval(() => {dt.setSeconds(dt.getSeconds() + 1); document.getElementById("current-seconds").innerText = pad(dt.getSeconds(), 2)}, 1000)
}

function setMap(res, ip) {
  let q
  if (localStorage.getItem("mode") === "0")
  {
    q = `IP:&nbsp;<b>${ip}</b><br><nobr>Country:&nbsp;<b>${res.countryName}</b>&nbsp;<img id="flag" src="https://www.countryflags.io/${res.countryCode}/shiny/16.png"><br>`
    if (res.city === "")
      q += `Locality:&nbsp;<b>${res.localityInfo.administrative[2].name}</b></nobr>`
    else
      q += `City:&nbsp;<b>${res.city}</b></nobr>`
  }
  else
  {
    q = `<nobr>Country:&nbsp;<b>${res.countryName}</b>&nbsp;<img id="flag" src="https://www.countryflags.io/${res.countryCode}/shiny/16.png">`
    levels.forEach((section, i) => q += `<br>${section}:&nbsp;<b>${res.localityInfo.administrative[i + 1].name}</b>`)
    q += `</nobr>`
  }
  let osmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    osmAttrib = '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    osm1 = L.tileLayer(osmUrl, {
      maxZoom: 18,
      minZoom: 1,
      attribution: osmAttrib,
    }),
    bounds = new L.LatLngBounds(new L.LatLng(-90, -200), new L.LatLng(90, 200));
  if (typeof map !== "undefined")
    map.remove()
  map = new L.Map("map", {
    center: [res.latitude, res.longitude],
    zoom: 7,
    layers: [osm1],
    maxBounds: bounds,
    maxBoundsViscosity: 1,
    scrollWheelZoom: false,
  });
  L.control.scale().addTo(map);
  let marker = new L.marker([res.latitude, res.longitude])
  marker.addTo(map)
  marker.bindPopup(q).openPopup()
  L.easyButton(`<svg style = "position: relative; top: 24.5%; left: 8.5%;">
  <path d="M16 .5a.5.5 0 0 0-.598-.49L10.5.99 5.598.01a.5.5 0 0 0-.196 0l-5 1A.5.5 0 0 0 0 1.5v14a.5.5 0 0 0 .598.49l4.902-.98 4.902.98a.502.502 0 0 0 .196 0l5-1A.5.5 0 0 0 16 14.5V.5zM5 14.09V1.11l.5-.1.5.1v12.98l-.402-.08a.498.498 0 0 0-.196 0L5 14.09zm5 .8V1.91l.402.08a.5.5 0 0 0 .196 0L11 1.91v12.98l-.5.1-.5-.1z"/>
</svg>`, function(){
    marker.openPopup();
    map.flyTo(marker.getLatLng(), 7);
  }).addTo(map);
}

async function common(lat, lon)
{
  return fetch(`https://api.timezonedb.com/v2.1/get-time-zone?key=V93XTZV53UPM&format=json&by=position&lat=${lat}&lng=${lon}`)
  .then((r) => r.json())
  .then((b) => {
      tz = b.zoneName.replaceAll("_", " ")
      if (b.gmtOffset >= 0)
        utc = '+'
      utcs = (String(b.gmtOffset / 3600)).split(".")
      utc += pad(utcs[0], 2) + ":"
      if (utcs.length < 2)
        utc += "00"
      else
        utc += pad(60 / (10 / parseInt(utcs[1])), 2)
      dt = new Date(b.formatted.replace(" ", "T"))
  })
}

function geo_mode(pos) {
  let lat = pos.coords.latitude
  let lon = pos.coords.longitude
  fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}`)
  .then(r => r.json())
  .then(b =>
      common(lat, lon)
      .then(() => setAll(b))
      .then(() => {
        setVisible('#loading', false);
        $('#mode').bootstrapToggle('enable')
        document.getElementById("page").style.opacity = 100
      })
    )
}

function setVisible(selector, visible) {
  document.querySelector(selector).style.display = visible ? 'block' : 'none';
}

function ip_mode() {
  fetch('https://ipv4.ip.nf/me.json')
  .then((r) => r.json())
  .then((b) =>
  {
    let lat = b.ip.latitude
    let lon = b.ip.longitude
      fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}`)
      .then(r => r.json())
      .then(b1 => common(lat, lon).then(() => setAll(b1, b.ip.ip)))
      .then(() => {
        setVisible('#loading', false);
        $('#mode').bootstrapToggle('enable')
        document.getElementById("page").style.opacity = 100
      })
  })
}

function error()
{
  $('#mode').bootstrapToggle('enable')
  modes[0]() 
}

function getPos()
{
  navigator.geolocation.getCurrentPosition(geo_mode, error)
}

document.getElementById("container").onclick = () => {
  if (!$('#mode').is(':disabled'))
  {
    $('#mode').bootstrapToggle('toggle')
    $('#mode').bootstrapToggle('disable')
    setVisible('#loading', true);
    document.getElementById("page").style.opacity = 0.5
    localStorage.setItem("mode", localStorage.getItem("mode") ^ 1)
    modes[localStorage.getItem("mode")]()
  }
}


function init()
{
  if (localStorage.getItem("mode") === null)
    localStorage.setItem("mode", 0)
  if (localStorage.getItem("mode") === "1")
    $('#mode').bootstrapToggle('toggle')
  $('#mode').bootstrapToggle('disable')
  modes[localStorage.getItem("mode")]()
}

window.onload = () => init()
