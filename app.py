import streamlit as st
import pandas as pd
from datetime import datetime
import db

# --- Configuração da Página ---
st.set_page_config(
    page_title="H2O Habits",
    page_icon="💧",
    layout="centered"
)

# --- Funções Auxiliares ---
def refresh_data():
    """Recarrega os dados da aplicação."""
    st.rerun()

# --- Título e Subtítulo ---
st.title("H2O Habits 💧")
st.markdown("Transforme hidratação em rotina prazerosa.")

# --- Seção de Meta Diária ---
with st.expander("🎯 Meta Diária", expanded=True):
    current_goal = db.get_goal()
    goal = st.number_input(
        "Defina sua meta de consumo de água (em ml)",
        min_value=500,
        max_value=10000,
        value=current_goal,
        step=100
    )
    if st.button("Salvar Meta"):
        db.set_goal(goal)
        st.success(f"Meta salva em {goal} ml!")
        refresh_data()

# --- Seção de Progresso ---
st.header("📈 Progresso de Hoje")
today_entries = db.get_today_entries()
consumed_today = sum(entry['amount'] for entry in today_entries)
progress_percent = min(100, int((consumed_today / goal) * 100))

st.metric(label="Consumido Hoje", value=f"{consumed_today} ml", delta=f"de {goal} ml")
st.progress(progress_percent)

st.markdown("---")

# --- Adicionar Consumo ---
st.subheader("Adicionar Consumo")
cols = st.columns([1, 1, 1, 2])
quick_adds = [200, 250, 300]

for i, amount in enumerate(quick_adds):
    if cols[i].button(f"+ {amount} ml"):
        db.add_entry(amount)
        st.toast(f"💧 {amount} ml adicionados!", icon="✅")
        refresh_data()

custom_amount = cols[3].number_input("Outro valor (ml)", min_value=50, step=50, key="custom_add")
if cols[3].button("Adicionar"):
    if custom_amount > 0:
        db.add_entry(custom_amount)
        st.toast(f"💧 {custom_amount} ml adicionados!", icon="✅")
        refresh_data()

# --- Histórico de Hoje ---
if today_entries:
    st.subheader("Registros de Hoje")
    for entry in reversed(today_entries):
        time_str = datetime.fromtimestamp(entry['ts']).strftime('%H:%M')
        st.text(f"💧 {entry['amount']} ml às {time_str}")

st.markdown("---")

# --- Seção de Histórico ---
st.header("📊 Histórico de Consumo")
range_option = st.selectbox("Ver histórico", ["Últimos 7 dias", "Últimos 30 dias"])
days = 30 if range_option == "Últimos 30 dias" else 7

history_data = db.get_data_for_range(days)
if history_data["values"]:
    chart_data = pd.DataFrame({
        'Data': history_data['labels'],
        'Consumo (ml)': history_data['values']
    })
    st.bar_chart(chart_data.set_index('Data'))
else:
    st.info("Ainda não há dados suficientes para exibir o histórico.")

# --- Rodapé ---
st.markdown("---")
st.markdown("<div style='text-align: center;'>Feito para o seu bem-estar. Beba água. 💧</div>", unsafe_allow_html=True)
