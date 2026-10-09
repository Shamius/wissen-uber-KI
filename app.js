"use strict";
const $=id=>document.getElementById(id);
const TOTAL=QUESTION_DATA.length;
const questions=QUESTION_DATA.map((r,i)=>({
  id:i+1, topic:r[0], multiple:r[1]==="m", text:r[2],
  options:r[3], correct:r[4].split("").map(letter=>letter.charCodeAt(0)-65)
}));
let sequence=[],position=0,answers=new Map(),resultText="";
function shuffled(array){
  const arr=array.slice();
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
function show(id){
  for(const name of ["intro","quiz","result"])$(name).classList.toggle("hide",name!==id);
}
function start(){
  answers=new Map();position=0;resultText="";
  sequence=shuffled(questions).map(q=>({q,order:shuffled([0,1,2,3])}));
  show("quiz");render();
  window.scrollTo({top:0,behavior:"instant"});
}
function current(){return sequence[position]}
function render(){
  const item=current(),q=item.q,selected=answers.get(q.id);
  $("progressText").textContent="Вопрос "+(position+1)+" из "+TOTAL;
  $("section").textContent=TOPIC_NAMES[q.topic];
  $("bar").style.width=((position)/TOTAL*100)+"%";
  $("type").textContent=q.multiple?"Несколько вариантов":"Один вариант";
  $("prompt").textContent=q.text;
  $("help").textContent=q.multiple?
    "Отметь все подходящие ответы. Один балл можно получить только за полный правильный набор.":
    "Выбери один вариант. Если не знаешь, нажми «Не знаю».";
  const root=$("options");
  root.replaceChildren();
  for(const originalIndex of item.order){
    const label=document.createElement("label");
    label.className="option";
    const input=document.createElement("input");
    input.type=q.multiple?"checkbox":"radio";
    input.name="answer";
    input.value=String(originalIndex);
    input.checked=Array.isArray(selected)&&selected.includes(originalIndex);
    const span=document.createElement("span");
    span.textContent=q.options[originalIndex];
    input.addEventListener("change",()=>{
      const old=answers.get(q.id);
      let next=Array.isArray(old)?old.slice():[];
      if(q.multiple){
        if(input.checked)next.push(originalIndex);
        else next=next.filter(idx=>idx!==originalIndex);
        next=[...new Set(next)];
      }else{
        next=[originalIndex];
      }
      if(next.length)answers.set(q.id,next);else answers.delete(q.id);
      refreshChoices();
    });
    label.append(input,span);
    root.append(label);
  }
  refreshChoices();
  $("back").disabled=position===0;
  $("next").textContent=position===TOTAL-1?"Завершить →":"Дальше →";
}
function refreshChoices(){
  const item=current(),selected=answers.get(item.q.id);
  [...$("options").querySelectorAll(".option")].forEach((label,i)=>{
    const idx=item.order[i],isChosen=Array.isArray(selected)&&selected.includes(idx);
    label.classList.toggle("selected",isChosen);
    label.querySelector("input").checked=isChosen;
  });
  $("next").disabled=!answers.has(item.q.id);
}
function next(){
  if(!answers.has(current().q.id))return;
  forward();
}
function skip(){
  answers.set(current().q.id,null);
  forward();
}
function forward(){
  if(position===TOTAL-1){complete();return;}
  position++;
  render();
  // Не прокручиваем страницу при смене вопроса.
}
function back(){
  if(position===0)return;
  position--;
  render();
}
function isCorrect(q){
  const value=answers.get(q.id);
  return Array.isArray(value) &&
    value.length===q.correct.length &&
    q.correct.every(index=>value.includes(index));
}
function results(){
  return TOPIC_NAMES.map((name,i)=>{
    const group=questions.filter(q=>q.topic===i);
    return {name,correct:group.filter(isCorrect).length,total:group.length};
  });
}
function buildText(rows,score,skipped){
  return "ИИ для УОБР — результат диагностики до обучения\n"+
    "Итого: "+score+" из "+TOTAL+"\n"+
    "Пропущено: "+skipped+"\n\n"+
    "По темам:\n"+rows.map(row=>row.name+": "+row.correct+" из "+row.total).join("\n")+
    "\n\nРезультат отражает ответы на вопросы, а не практические навыки.";
}
function complete(){
  const rows=results();
  const score=rows.reduce((sum,r)=>sum+r.correct,0);
  const skipped=questions.filter(q=>answers.get(q.id)===null).length;
  resultText=buildText(rows,score,skipped);
  $("score").replaceChildren();
  const total=document.createElement("span");
  total.textContent=" / "+TOTAL+" баллов";
  $("score").append(document.createTextNode(String(score)),total);
  $("summary").textContent=
    "Ты ответил на "+(TOTAL-skipped)+" вопросов и пропустил "+skipped+
    ". Это срез текущих знаний: его удобно использовать как отправную точку перед обучением.";
  const root=$("topics");
  root.replaceChildren();
  for(const row of rows){
    const wrapper=document.createElement("div");
    wrapper.className="topic";
    const head=document.createElement("div");
    head.className="topichead";
    const label=document.createElement("strong");
    label.textContent=row.name;
    const fraction=document.createElement("span");
    fraction.textContent=row.correct+" / "+row.total;
    head.append(label,fraction);
    const track=document.createElement("div");
    track.className="topictrack";
    const bar=document.createElement("div");
    bar.style.width=(100*row.correct/row.total)+"%";
    track.append(bar);
    wrapper.append(head,track);
    root.append(wrapper);
  }
  $("status").textContent="";
  show("result");
  window.scrollTo({top:0,behavior:"instant"});
}
async function copyResult(){
  try{
    await navigator.clipboard.writeText(resultText);
    $("status").textContent="Результат скопирован.";
  }catch(error){
    $("status").textContent="Не удалось скопировать автоматически. Используй кнопку скачивания.";
  }
}
function downloadResult(){
  const blob=new Blob([resultText],{type:"text/plain;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download="rezultat-II-UOBR.txt";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  $("status").textContent="Файл подготовлен для скачивания.";
}
$("start").addEventListener("click",start);
$("next").addEventListener("click",next);
$("back").addEventListener("click",back);
$("skip").addEventListener("click",skip);
$("restart").addEventListener("click",start);
$("copy").addEventListener("click",copyResult);
$("download").addEventListener("click",downloadResult);
