"use strict";
const $=id=>document.getElementById(id);
const TOTAL=QUESTION_DATA.length;
const questions=QUESTION_DATA.map((r,i)=>({
  id:i+1, topic:r[0], multiple:r[1]==="m", text:r[2],
  options:r[3], rationale:r[5], explanation:r[6], correct:r[4].split("").map(letter=>letter.charCodeAt(0)-65)
}));
let sequence=[],position=0,answers=new Map(),resultText="",reviewAll=false;
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
  answers=new Map();position=0;resultText="";reviewAll=false;
  sequence=shuffled(questions).map(q=>({q,order:shuffled(q.options.map((_,i)=>i))}));
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

function chosen(q){
  const value=answers.get(q.id);
  return Array.isArray(value)?value:[];
}
function skipped(q){return answers.get(q.id)===null}
function wrongQuestions(){return sequence.filter(item=>!isCorrect(item.q))}
function formatOptions(q,indices){
  return indices.length?indices.map(i=>q.options[i]).join("; "):"Нет ответа";
}
function explanationLines(q){
  const selected=chosen(q),correct=q.correct;
  const lines=[];
  if(q.multiple){
    for(const idx of selected.filter(i=>correct.includes(i)))lines.push(["Выбрано верно",idx]);
    for(const idx of selected.filter(i=>!correct.includes(i)))lines.push(["Выбрано лишнее",idx]);
    for(const idx of correct.filter(i=>!selected.includes(i)))lines.push(["Не выбрано, но верно",idx]);
  }else{
    if(selected.length && !correct.includes(selected[0]))lines.push(["Почему выбранный ответ не подходит",selected[0]]);
    for(const idx of correct)lines.push(["Почему это решение верно",idx]);
  }
  return lines;
}
function buildText(rows,score,missedCount){
  const skippedCount=questions.filter(skipped).length;
  const parts=[
    "ИИ для УОБР — результат диагностики до обучения",
    "Итого: "+score+" из "+TOTAL,
    "Неверных и пропущенных: "+missedCount,
    "Пропущено: "+skippedCount,
    "",
    "По темам:",
    ...rows.map(r=>r.name+": "+r.correct+" из "+r.total)
  ];
  const bad=wrongQuestions();
  if(bad.length){
    parts.push("","Разбор неверных и пропущенных ответов:");
    bad.forEach((item)=>{
      const q=item.q;
      parts.push("","Вопрос: "+q.text);
      parts.push("Ваш ответ: "+formatOptions(q,chosen(q)));
      parts.push("Верно: "+formatOptions(q,q.correct));
      parts.push("Объяснение: "+q.explanation);
      explanationLines(q).forEach(([label,index])=>parts.push(label+" — "+q.options[index]+". "+q.rationale[index]));
    });
  }
  parts.push("","Результат отражает ответы на вопросы, а не практические навыки.");
  return parts.join("\n");
}
function addAnswerRow(card,labelText,value,isRight){
  const outer=document.createElement("div");
  outer.className="answerrow";
  const label=document.createElement("span");
  label.className="answerlabel";
  label.textContent=labelText;
  const valueNode=document.createElement("span");
  valueNode.className="answertext"+(isRight?" right":"");
  valueNode.textContent=value;
  outer.append(label,valueNode);card.append(outer);
}
function createReviewCard(item,seqIndex){
  const q=item.q,card=document.createElement("div");
  card.className="reviewcard";
  const meta=document.createElement("p");
  meta.className="reviewmeta";
  meta.textContent="Вопрос "+(seqIndex+1)+" · "+TOPIC_NAMES[q.topic]+
    " · "+(skipped(q)?"Пропущен":isCorrect(q)?"Верно":"Ошибка");
  const prompt=document.createElement("p");
  prompt.className="reviewquestion";
  prompt.textContent=q.text;
  card.append(meta,prompt);
  addAnswerRow(card,"Твой ответ",formatOptions(q,chosen(q)),false);
  addAnswerRow(card,"Правильный ответ",formatOptions(q,q.correct),true);
  const reason=document.createElement("div");
  reason.className="reason";
  const lines=explanationLines(q);
  for(const [label,index] of lines){
    const p=document.createElement("p");
    const strong=document.createElement("strong");
    strong.textContent=label+": ";
    p.append(strong,document.createTextNode(q.rationale[index]));
    reason.append(p);
  }
  const explanation=document.createElement("p");
  const heading=document.createElement("strong");
  heading.textContent="Объяснение: ";
  explanation.append(heading,document.createTextNode(q.explanation));
  reason.prepend(explanation);
  card.append(reason);
  return card;
}
function renderReview(){
  const errors=wrongQuestions();
  const entries=reviewAll?sequence:errors;
  const root=$("reviewList");
  root.replaceChildren();
  if(!entries.length){
    const noErrors=document.createElement("p");
    noErrors.className="muted";
    noErrors.textContent="Ошибок нет. Можно открыть объяснения ко всем вопросам.";
    root.append(noErrors);
  }else{
    for(const item of entries)root.append(createReviewCard(item,sequence.indexOf(item)));
  }
  $("reviewLead").textContent=errors.length?
    "Неверных и пропущенных ответов: "+errors.length+
      ". Ниже можно увидеть свои ответы, верные варианты и причины расхождений.":
    "Все ответы верные.";
  $("toggleReview").textContent=reviewAll?"Показывать только ошибки":"Показать разбор всех вопросов";
  $("toggleReview").setAttribute("aria-expanded",String(reviewAll));
}
function complete(){
  const rows=results();
  const score=rows.reduce((sum,r)=>sum+r.correct,0);
  const skippedCount=questions.filter(skipped).length;
  const errors=wrongQuestions().length;
  resultText=buildText(rows,score,errors);
  $("score").replaceChildren();
  const total=document.createElement("span");
  total.textContent=" / "+TOTAL+" баллов";
  $("score").append(document.createTextNode(String(score)),total);
  $("summary").textContent=
    "Ты ответил на "+(TOTAL-skippedCount)+" вопросов и пропустил "+skippedCount+
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
  reviewAll=false;
  renderReview();
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
$("toggleReview").addEventListener("click",()=>{reviewAll=!reviewAll;renderReview()});
