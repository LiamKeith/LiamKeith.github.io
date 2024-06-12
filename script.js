let button1Clicked = false;
let button2Clicked = false;

document.querySelector('.clickme').addEventListener('click', () => {
  button1Clicked = !button1Clicked;
  checkBothButtonsClicked();
  document.querySelectorAll('.hidden').forEach((item) => {
    item.classList.toggle("showing") 
  })
});

document.querySelector('.clickme2').addEventListener('click', () => {
  button2Clicked = !button2Clicked;
  checkBothButtonsClicked();
  document.querySelectorAll('.hidden2').forEach((item) => {
    item.classList.toggle("showing2") 
  })
});

document.querySelectorAll('.clickme, .clickme2').forEach((button) => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.hidden3').forEach((item) => {
            item.classList.toggle("showing3");
        });
    });
});

function checkBothButtonsClicked() {
    let action = (button1Clicked && button2Clicked) ? 'add' : 'remove';
    document.querySelectorAll('.hidden4').forEach((item) => {
        item.classList[action]("showing4");
    });
}