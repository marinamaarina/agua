const tips = [
  'Comece o dia com um copo de água para ativar o corpo.',
  'Mantenha uma garrafa à vista para lembrar de beber.',
  'Use pequenos goles frequentes para criar hábito.',
  'Beba água antes das refeições para ajudar a saciedade.',
  'Ajuste sua meta conforme clima e atividade física.',
  'Defina lembretes em horários de pausa.',
  'Prefira água ao invés de bebidas açucaradas.',
  'Observe a cor da urina: quanto mais clara, melhor.',
  'Inclua frutas ricas em água (melancia, laranja).',
  'Associe beber água a tarefas recorrentes (check-ins).'
];

/* ...existing code... */
export function getRandomTip() {
  return tips[Math.floor(Math.random() * tips.length)];
}
/* ...existing code... */

