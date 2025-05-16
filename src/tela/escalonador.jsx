// Escalonador.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, HardDrive, Clock, Zap, List, Trash2, Plus, Play, Pause, Activity, X, Info } from 'lucide-react';

// Modal de Histórico
const HistoryModal = ({ isOpen, onClose, movementLog }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><List size={18} /> Histórico de Processos</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="log-table">
          <div className="log-header"><span>PID</span><span>Evento</span><span>Horário</span></div>
          {movementLog.map(log => (
            <div key={log.id} className="log-row"><span>#{log.pid}</span><span>{log.action}</span><span>{log.time}</span></div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// Modal de Informação
const InfoModal = ({ isOpen, section, onClose }) => {
  if (!isOpen) return null;
  const infoMap = {
    create: {
      title: 'Criar Processo',
      text: 'Esta seção permite que você crie novos processos. Defina a prioridade do processo (de 1 a 4), o tipo (CPU-bound ou I/O-bound) e o tempo de execução (duração) em segundos. O processo será adicionado à fila de acordo com sua prioridade.'
    },
    queues: {
      title: 'Filas de Prioridade',
      text: 'Existem 4 filas de prioridade, numeradas de 1 (mais alta) a 4 (mais baixa). O escalonador sempre seleciona o próximo processo da fila de maior prioridade que não está vazia. As filas são usadas para garantir que processos mais importantes sejam executados primeiro.'
    },
    execution: {
      title: 'Execução e Espera',
      text: '"Em Execução" significa que o processo está sendo processado pela CPU. "Em Espera" significa que o processo está aguardando na fila para ser executado. Quando um processo é executado, seu tempo de execução diminui até que termine ou seja interrompido.'
    },
    table: {
      title: 'Tabela de Processos',
      text: 'A tabela exibe todos os processos que estão no sistema, incluindo aqueles que já foram concluídos. Para cada processo, é mostrado o PID, prioridade, tempo restante de execução, estado (em execução, esperando ou concluído), e tempo de espera.'
    }
  };
  const info = infoMap[section] || {};
  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{info.title}</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body"><p>{info.text}</p></div>
      </motion.div>
    </div>
  );
};

// Card de Processo
const ProcessCard = ({ process, colors, onRemove }) => {
  const progress = ((process.burstTime - process.remainingTime) / process.burstTime) * 100;
  return (
    <motion.div className="process-card" style={{ borderLeft: `4px solid ${colors}` }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="card-header">
        <span className="card-title">PID {process.id}</span>
        <span className={`state-badge ${process.status}`}><Activity size={12} /> {process.status}</span>
      </div>
      <div className="card-body">
        <div className="card-row">{process.type === 'CPU-bound' ? <Cpu size={12} /> : <HardDrive size={12} />} {process.type}</div>
        <div className="card-row"><Zap size={12} /> Prio {process.priority}</div>
        <div className="card-row"><Clock size={12} /> Rest: {process.remainingTime}s</div>
        <div className="card-row">
          <div className="card-progress"><div className="progress-bg"><div className="progress-fill" style={{ width: `${progress}%` }} /></div><span>{Math.round(progress)}%</span></div>
        </div>
        <button className="remove-btn-card" onClick={() => onRemove(process.id)}><Trash2 size={14} /> Remover</button>
      </div>
    </motion.div>
  );
};

// Linhas da Tabela
const ProcessRow = ({ process, onRemove }) => {
  const progress = ((process.burstTime - process.remainingTime) / process.burstTime) * 100;
  return (
    <motion.tr initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3 }}>
      <td>{process.id}</td>
      <td><Zap size={14} /> {process.priority}</td>
      <td><Clock size={14} /> {process.arrivalTime}s</td>
      <td>{process.burstTime}s</td>
      <td><div className="remaining-time-container"><div className="remaining-time-bar" style={{ width: `${(process.remainingTime / process.burstTime) * 100}%` }} /><span>{process.remainingTime}s</span></div></td>
      <td><div className="progress-container"><div className="progress-bar" style={{ width: `${progress}%` }}><span>{Math.round(progress)}%</span></div></div></td>
      <td className={`state-badge ${process.status}`}><Activity size={14} /> {process.status}</td>
      <td>{process.waitTime}s</td>
      <td><button className="remove-btn" onClick={() => onRemove(process.id)}><Trash2 size={14} /></button></td>
    </motion.tr>
  );
};

// Fila de Processos
const Queue = ({ priority, processes, color, onRemove }) => (
  <div className="queue">
    <div className="queue-header"><div className="queue-title"><List size={16} /> <h3>Fila {priority}</h3></div><span className="process-count">{processes.length}</span></div>
    <div className="process-stack">
      {processes.map(p => <ProcessCard key={p.id} process={p} colors={color} onRemove={onRemove} />)}
    </div>
  </div>
);

// Escalonador
const Escalonador = () => {
  const [form, setForm] = useState({ priority: 1, type: '', time: '' });
  const [processes, setProcesses] = useState([]);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [pid, setPid] = useState(1);
  const [showHist, setShowHist] = useState(false);
  const [infoSection, setInfoSection] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const logIdRef = useRef(0);
  const colors = { 'CPU-bound': '#f59e0b', 'I/O-bound': '#3b82f6', waiting: '#10b981' };

  // Loop de escalonamento
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setProcesses(prev => {
        // reseta o status dos processos em execução
        // se o tempo restante for maior que 0, muda o status para 'waiting'
        const reset = prev.map(p => (p.status === 'running' && p.remainingTime > 0 ? { ...p, status: 'waiting' } : p));

        // seleciona o próximo processo em espera
        const next = reset.find(p => p.status === 'waiting');
        if (!next) return reset;
        return reset.map(p => {
          if (p.id === next.id) {
            const rem = Math.max(0, p.remainingTime - 1);
            const status = rem > 0 ? 'running' : 'finished';

            // Registra no histórico
            const nextLogId = ++logIdRef.current;
            setLog(prevLog => [
              { id: nextLogId, pid: p.id, action: rem > 0 ? 'Executou 1s' : 'Processo Concluído', time: new Date().toLocaleTimeString() },
              ...prevLog.slice(0, 14)
            ]);
            return { ...p, remainingTime: rem, status };
          }
          // Se o processo não for o próximo, aumenta o tempo de espera
          if (p.status === 'waiting') return { ...p, waitTime: p.waitTime + 1 };
          return p;
        });
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  // Adicionar processo
  const handleAdd = () => {
    const np = {
      id: `P${pid.toString().padStart(3, '0')}`,
      priority: form.priority,
      type: form.type,
      burstTime: +form.time,
      remainingTime: +form.time,
      arrivalTime: 0,
      status: 'waiting',
      waitTime: 0
    };

    setPid(pid + 1);
    setProcesses(prev => [...prev, np]);
    const nextLogId = ++logIdRef.current; //controlar o id do log para evitar duplicação
    // Registra no histórico
    setLog(prevLog => [
      {
        id: nextLogId,
        pid: np.id,
        action: 'Processo Criado',
        time: new Date().toLocaleTimeString()
      },
      ...prevLog.slice(0, 14)
    ]);
    setForm({ ...form, time: '' });
  };

  // Remove process (mark finished)
  const handleRemove = id => {
    setProcesses(prev => prev.map(p => (p.id === id ? { ...p, status: 'finished' } : p)));

    // Registra no histórico
    const nextLogId = ++logIdRef.current;
    setLog(prevLog => [
      {
        id: nextLogId,
        pid: id,
        action: 'Processo Removido',
        time: new Date().toLocaleTimeString()
      },
      ...prevLog.slice(0, 14)
    ]);
  };

  const openInfo = sec => { setInfoSection(sec); setShowInfo(true); };

  // derive queues
  const queues = { 1: [], 2: [], 3: [], 4: [] };
  processes.forEach(p => { if (p.status === 'waiting') queues[p.priority].push(p); });

  return (
    <div className="container">
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1><Zap size={24} /> Escalonador MLQ</h1>
        <p>Sistema multi-nível com monitoramento em tempo real</p>
      </motion.header>

      {/* Criar Processo */}
      <section className="control-panel">
        <div className="section-header"><h2>Criar Processo</h2><Info className="info-icon" size={16} onClick={() => openInfo('create')} /></div>
        <div className="form-container">
          <input
            type="number"
            value={form.priority}
            onChange={e => {
              const value = parseInt(e.target.value, 10);
              if (value >= 1 && value <= 4) {
                setForm({ ...form, priority: value });
              }
            }}
            placeholder="Prioridade (1–4)"
          />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="">Tipo</option>
            <option value="CPU-bound">CPU-bound</option>
            <option value="I/O-bound">I/O-bound</option>
          </select>
          <input type="number" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} placeholder="Burst (s)" />
          <button className="add-btn" onClick={handleAdd}><Plus size={14} /> Adicionar</button>
          <button className={`control-btn ${running ? 'pause' : 'start'}`} onClick={() => setRunning(!running)}>{running ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> Iniciar</>}</button>
        </div>
      </section>

      {/* Filas */}
      <section className="queues-section">
        <div className="section-header"><h2>Filas</h2><Info className="info-icon" size={16} onClick={() => openInfo('queues')} /></div>
        <div className="queues-grid">{[1, 2, 3, 4].map(pr => <Queue key={pr} priority={pr} processes={queues[pr]} color={pr <= 2 ? colors['CPU-bound'] : colors['I/O-bound']} onRemove={handleRemove} />)}</div>
        <button className="history-btn" onClick={() => setShowHist(true)}><List size={16} /> Ver Histórico</button>
      </section>

      {/* Execução/Espera */}
      <section className="execution-waiting-section">
        <div className="section-header"><h2>Execução/Espera</h2><Info className="info-icon" size={16} onClick={() => openInfo('execution')} /></div>
        <div className="execution-section">
          <div><h3><Zap size={18} /> Execução</h3><div className="process-stack">{processes.filter(p => p.status === 'running').map(p => <ProcessCard key={p.id} process={p} colors={colors[p.type]} onRemove={handleRemove} />)}</div></div>
          <div><h3><Clock size={18} /> Espera</h3><div className="process-stack">{processes.filter(p => p.status === 'waiting').map(p => <ProcessCard key={p.id} process={p} colors={colors.waiting} onRemove={handleRemove} />)}</div></div>
        </div>
      </section>

      {/* Tabela */}
      <section className="process-table-section">
        <div className="section-header"><h2>Tabela</h2><Info className="info-icon" size={16} onClick={() => openInfo('table')} /></div>
        <motion.div className="table-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <table className="process-table">
            <thead><tr><th>PID</th><th>Prio</th><th>Cheg</th><th>Burst</th><th>Rest</th><th>%</th><th>Estado</th><th>Espera</th><th>Ação</th></tr></thead>
            <tbody>
              <AnimatePresence>
                {processes.filter(p => p.status !== 'finished')  // Filtro para não mostrar processos finalizados
                  .map(p => (
                    <ProcessRow key={p.id} process={p} onRemove={handleRemove} />
                  ))}
              </AnimatePresence>
              {/*<AnimatePresence>{processes.map(p => <ProcessRow key={p.id} process={p} onRemove={handleRemove} />)}</AnimatePresence>*/}

            </tbody>
          </table>
        </motion.div>
      </section>

      {/* Modais */}
      <HistoryModal isOpen={showHist} onClose={() => setShowHist(false)} movementLog={log} />
      <InfoModal isOpen={showInfo} section={infoSection} onClose={() => setShowInfo(false)} />
    </div>
  );
};

export default Escalonador;
