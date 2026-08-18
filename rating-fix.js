(()=>{
  let shownAnime=null;
  const mountRating=()=>{
    const host=document.querySelector('#animeAwards');
    if(!host||typeof selectedAnime==='undefined'||typeof authClient==='undefined')return;
    const currentAnime=selectedAnime;
    host.querySelectorAll('.rating-widget,.personal-rating').forEach(node=>node.remove());
    const existing=host.querySelector('#fixedRating');
    if(existing&&shownAnime===currentAnime)return;
    existing?.remove();
    shownAnime=currentAnime;
    const card=document.createElement('section');
    card.id='fixedRating';
    card.innerHTML='<div class="fixed-rating-head"><span>Ваша оценка</span><b>—</b></div><input type="range" min="1" max="10" step="0.1" value="7.1" aria-label="Оценка аниме"><div class="fixed-rating-scale"><span>1</span><span>10</span></div>';
    host.append(card);
    const slider=card.querySelector('input'),label=card.querySelector('b');
    authClient.auth.getUser().then(({data:{user}})=>{
      const scores=user?.user_metadata?.personalRatings||{};
      const saved=Number(scores[currentAnime]);
      if(Number.isFinite(saved)&&saved>=1&&saved<=10){slider.value=saved.toFixed(1);label.textContent=saved.toFixed(1)}else label.textContent=user?'7.1':'—';
      slider.disabled=!user;
      slider.oninput=()=>label.textContent=Number(slider.value).toFixed(1);
      slider.onchange=async()=>{
        const {data:{user:activeUser}}=await authClient.auth.getUser();
        if(!activeUser){setAuthMode('signin');authModal.classList.add('open');return}
        const meta=activeUser.user_metadata||{};
        const personalRatings={...(meta.personalRatings||{}),[currentAnime]:Number(slider.value)};
        const {data,error}=await authClient.auth.updateUser({data:{...meta,personalRatings}});
        if(error){toastMessage('Не удалось сохранить оценку.');return}
        setProfile(data.user);toastMessage(`Ваша оценка: ${Number(slider.value).toFixed(1)}`);
      };
    });
  };
  document.head.insertAdjacentHTML('beforeend','<style>#animeAwards .rating-widget,#animeAwards .personal-rating{display:none!important}#fixedRating{margin-top:14px;padding-top:14px;border-top:1px solid #ffffff12}#fixedRating .fixed-rating-head{display:flex;align-items:center;justify-content:space-between}#fixedRating span{font-size:10px;color:#a9aab2}#fixedRating b{font:700 21px Manrope;color:#f3c957}#fixedRating input{width:100%;accent-color:#8a6cf6;cursor:pointer;margin:13px 0 1px}#fixedRating input:disabled{opacity:.45;cursor:not-allowed}.fixed-rating-scale{display:flex;justify-content:space-between;color:#777984;font-size:10px}</style>');
  mountRating();setInterval(mountRating,250);
})();