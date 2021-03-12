'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnEdit = document.querySelector('.btn__edit');
const btnDelete = document.querySelector('.btn__delete');
const btnDeleteAll = document.querySelector('.btn__delete_all');
const btnSort = document.querySelector('.btn--sort');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #workoutEditing;
  #currentWorkoutType = 'running';

  constructor() {
    // Get user's positions
    this._getPosititon();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    btnDeleteAll.addEventListener('click', this._deleteAllWorkouts.bind(this));
    btnSort.addEventListener('change', this._sortBy.bind(this));
  }

  _getPosititon() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          console.log('Could not get your location');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(` https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(coords)
      .addTo(this.#map)
      .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
      .openPopup();

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });

    this._showDeleteAllBtn();
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // If workout exist - save it
    if (this.#workoutEditing) {
      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;
      const [lat, lng] = [...this.#workoutEditing.coords];
      let workout;

      console.log(type);

      const index = this.#workouts.findIndex(
        workout => workout.id === this.#workoutEditing.id
      );

      if (this.#workouts[index].type === 'running') {
        const cadence = +inputCadence.value;
        workout = new Running([lat, lng], distance, duration, cadence);
      }
      if (this.#workouts[index].type === 'cycling') {
        const elevaton = +inputElevation.value;
        workout = new Cycling([lat, lng], distance, duration, elevaton);
      }

      this.#workouts[index] = workout;

      // Render workout on list
      this._renderWorkout(workout);

      // Hide form = Clear input ields
      this._hideForm();

      // Set local storage to all workouts
      this._setLocalStorage();

      return;
    }

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create runing object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevaton = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevaton) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevaton);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form = Clear input ields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();

    // Show delete all btn
    this._showDeleteAllBtn();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍' : '🚴‍'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout--controls">
            <button class="workout--controls btn btn__edit">✎ Edit</button>
            <button class="workout--controls btn btn__delete">❌ Delete</button>
          </div>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍' : '🚴‍'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
    `;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
    `;

    // remove Workout if it's edited
    if (this.#workoutEditing)
      this._removeFromHTMLWorkout(this.#workoutEditing.id);

    form.insertAdjacentHTML('afterend', html);
  }

  _removeFromHTMLWorkout(id) {
    const currentEditingWorkout = document.querySelector(`[data-id="${id}"]`);
    currentEditingWorkout.remove();
  }

  _showDeleteAllBtn() {
    if (this.#workouts.length !== 0) {
      btnDeleteAll.style.opacity = '1';
      document.querySelector('.sort').style.opacity = '1';
    }

    if (this.#workouts.length === 0) {
      btnDeleteAll.style.opacity = '0';
      document.querySelector('.sort').style.opacity = '0';
    }
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    const workoutEledit = e.target.closest('.btn__edit');
    const workoutEldelete = e.target.closest('.btn__delete');

    if (workoutEledit) this._editWorkout(e);
    if (workoutEldelete) this._deleteWorkout(e);
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _editWorkout(e) {
    e.preventDefault();
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#workoutEditing = workout;

    // Show form for editing
    this._showForm();

    // Change fucing field if type is different
    if (this.#currentWorkoutType !== workout.type) this._toggleElevationField();

    inputType.value = this.#currentWorkoutType = workout.type;
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    if (workout.type === 'running') inputCadence.value = workout.cadence;
    if (workout.type === 'cycling')
      inputElevation.value = workout.elevationGain;
  }

  _deleteWorkout(e) {
    e.preventDefault();
    e.stopPropagation();

    let agree = prompt('Are you sure? Y or N');

    if (agree === 'Y' || agree === 'y') {
      const workoutEl = e.target.closest('.workout');

      if (!workoutEl) return;

      const index = this.#workouts.findIndex(
        workout => workout.id === workoutEl.dataset.id
      );

      // remove Workout if it's edited
      this._removeFromHTMLWorkout(workoutEl.dataset.id);

      this.#workouts.splice(index, 1);

      // Set local storage to all workouts
      this._setLocalStorage();

      // Show del btn
      this._showDeleteAllBtn();

      return;
    }
  }
  _deleteAllWorkouts(e) {
    e.preventDefault();
    console.log(`Delete all workouts clicked! 💋`);
    let agree = prompt('Are you sure? Yes or No');

    if (agree === 'Yes' || agree === 'yes') {
      this.reset();

      // Show del btn
      this._showDeleteAllBtn();
    }
  }

  _sortBy(e) {
    const selectedValue = e.target.selectedOptions[0].value;

    console.log(selectedValue);
    const workoutsSorted = this.#workouts
      .slice()
      .sort((a, b) => a[selectedValue] - b[selectedValue]);
    console.log(workoutsSorted);

    document.querySelectorAll('.workout').forEach(el => el.remove());

    workoutsSorted.forEach(workout => this._renderWorkout(workout));
  }
}

const app = new App();
