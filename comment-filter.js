(()=>{
  const profanity=/(?:хуй[а-яё]*|хуе[а-яё]*|пизд[а-яё]*|еб[а-яё]*|ёб[а-яё]*|бля[а-яё]*|сука[а-яё]*|мраз[а-яё]*|гандон[а-яё]*|пидор[а-яё]*|долбо[а-яё]*)/giu;
  document.addEventListener('submit',event=>{
    const form=event.target;
    if(form?.id!=='commentForm')return;
    const input=form.querySelector('#commentInput');
    if(!input)return;
    const original=input.value;
    const cleaned=original.replace(profanity,match=>'*'.repeat(match.length));
    if(cleaned!==original){input.value=cleaned;setTimeout(()=>toastMessage('Грубые слова заменены на ****.'),0)}
  },true);
})();