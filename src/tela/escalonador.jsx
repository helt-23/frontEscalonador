import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, HardDrive, Clock, Zap, List, Trash2, Plus, Play, Pause, Activity, X } from "lucide-react";

const ProcessCard = ({ process, colors }) => (
  <motion.div
    className="process-card"
    style={{ borderLeft: `3px solid ${colors}` }}
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="card-header">
      <div className="process-type" title="Tipo de Processo">
        {process.type === 'CPU-bound' ? <Cpu size={14} /> : <HardDrive size={14} />}
        <span>PID #{process.id}</span>
      </div>
      <div className="process-priority" title="Prioridade">
        <Zap size={14} />
        <span>Nível {process.priority}</span>
      </div>
    </div>
    <div className="card-body">
      <div className="process-time" title="Tempo Restante">
        <Clock size={14} />
        <span>{process.remainingTime}s</span>
      </div>
    </div>
  </motion.div>
);

const ProcessRow = ({ process, onRemove }) => {
  const progress = ((process.burstTime - process.remainingTime) / process.burstTime * 100);

  return (
    <motion.tr
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.3 }}
      className="process-row"
    >
      <td className="process-id">{process.id}</td>
      <td><Clock /> {process.arrivalTime}s</td>
      <td>{process.burstTime}s</td>
      <td>
        <div className="remaining-time-container">
          <div className="remaining-time-bar" style={{ width: `${(process.remainingTime / process.burstTime) * 100}%` }} />
          <span>{process.remainingTime}s</span>
        </div>
      </td>
      <td>
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        </div>
      </td>
      <td className={`state-badge ${process.status.toLowerCase()}`}>
        <Activity /> {process.status}
      </td>
      <td>{process.waitTime}s</td>
      <td>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="remove-button"
          onClick={() => onRemove(process.id)}
        >
          <Trash2 />
        </motion.button>
      </td>
    </motion.tr>
  );
};

const Queue = ({ priority, processes, color }) => (
  <div className="queue">
    <div className="queue-header">
      <div className="queue-title">
        <List size={16} />
        <h3>Fila Prioridade {priority}</h3>
      </div>
      <span className="process-count">{processes.length} processos</span>
    </div>
    <div className="process-stack">
      {processes.map((process) => (
        <ProcessCard key={process.id} process={process} colors={color} />
      ))}
    </div>
  </div>
);

const HistoryModal = ({ isOpen, onClose, movementLog }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3><List size={18} /> Histórico de Processos</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="log-table">
          <div className="log-header">
            <span>PID</span>
            <span>Evento</span>
            <span>Horário</span>
          </div>
          {movementLog.map(log => (
            <div key={log.id} className="log-row">
              <span>#{log.pid}</span>
              <span>{log.action}</span>
              <span>{log.time}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

const Escalonador = () => {
  const [form, setForm] = useState({ priority: 1, type: '', time: '' });
  const [processes, setProcesses] = useState([]);
  const [queues, setQueues] = useState({ 1: [], 2: [], 3: [], 4: [] });
  const [movementLog, setMovementLog] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [nextPid, setNextPid] = useState(1);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const colors = {
    'CPU-bound': '#f59e0b',
    'I/O-bound': '#3b82f6',
    waiting: '#10b981'
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'priority') {
      const numValue = Math.min(4, Math.max(1, Number(value) || 1));
      setForm(prev => ({ ...prev, [name]: numValue }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const addProcess = () => {
    const newProcess = {
      id: `P${nextPid.toString().padStart(3, '0')}`,
      priority: form.priority,
      type: form.type,
      burstTime: Number(form.time),
      remainingTime: Number(form.time),
      arrivalTime: 0,
      status: 'waiting',
      waitTime: 0
    };

    setNextPid(prev => prev + 1);
    setProcesses(prev => [...prev, newProcess]);
    updateQueues(newProcess);
    logMovement(newProcess.id, 'Processo criado');
    setForm(prev => ({ ...prev, time: '' }));
  };

  const updateQueues = (process) => {
    setQueues(prev => ({
      ...prev,
      [process.priority]: [...prev[process.priority], process]
    }));
  };

  const handleRemove = (id) => {
    setProcesses(prev => prev.filter(p => p.id !== id));
    setQueues(prev => {
      const newQueues = { ...prev };
      Object.keys(newQueues).forEach(queue => {
        newQueues[queue] = newQueues[queue].filter(p => p.id !== id);
      });
      return newQueues;
    });
  };

  const logMovement = (pid, action) => {
    setMovementLog(prev => [{
      id: Date.now(),
      pid,
      action,
      time: new Date().toLocaleTimeString(),
      type: form.type || 'waiting'
    }, ...prev.slice(0, 14)]);
  };

  return (
    <div className="container">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1><Zap size={24} /> Escalonador MLQ Integrado</h1>
        <p>Sistema de escalonamento multi-nível com monitoramento em tempo real</p>
      </motion.header>

      <section className="control-panel">
        <div className="form-container">
          <div className="input-group">
            <label>Prioridade (1-4)</label>
            <div className="input-field">
              <input
                name="priority"
                type="number"
                min="1"
                max="4"
                value={form.priority}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Tipo de Processo</label>
            <div className="input-field">
              <select
                name="type"
                value={form.type}
                onChange={handleInputChange}
              >
                <option value="">Selecione</option>
                <option value="CPU-bound">CPU-bound</option>
                <option value="I/O-bound">I/O-bound</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>Tempo de Execução (s)</label>
            <div className="input-field">
              <input
                name="time"
                type="number"
                value={form.time}
                onChange={handleInputChange}
                placeholder="Duração"
              />
            </div>
          </div>

          <button className="add-btn" onClick={addProcess}>
            <Plus size={16} /> Adicionar Processo
          </button>
        </div>

        <div className="controls">
          <button
            className={`control-btn ${isRunning ? 'pause' : 'start'}`}
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? <><Pause size={16} /> Pausar</> : <><Play size={16} /> Iniciar</>}
          </button>
        </div>
      </section>

      <section className="main-grid">
        <div className="queues-section">
          <div className="queues-grid">
            {[1, 2, 3, 4].map(priority => (
              <Queue
                key={priority}
                priority={priority}
                processes={queues[priority]}
                color={priority <= 2 ? colors['CPU-bound'] : colors['I/O-bound']}
              />
            ))}
          </div>

          <button
            className="history-btn"
            onClick={() => setIsHistoryModalOpen(true)}
          >
            <List size={16} /> Ver Histórico
          </button>
        </div>

        <div className="execution-section">
          <div className="execution-column">
            <h3><Zap size={18} /> Em Execução</h3>
            <div className="process-stack">
              {processes.filter(p => p.status === 'running').map(p => (
                <ProcessCard key={p.id} process={p} colors={colors[p.type]} />
              ))}
            </div>
          </div>

          <div className="waiting-column">
            <h3><Clock size={18} /> Em Espera</h3>
            <div className="process-stack">
              {processes.filter(p => p.status === 'waiting').map(p => (
                <ProcessCard key={p.id} process={p} colors={colors.waiting} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        movementLog={movementLog}
      />

      <section className="process-table-section">
        <motion.div
          className="table-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <table className="process-table">
            <thead>
              <tr>
                <th>Processo</th>
                <th className="text-center">Chegada</th>
                <th className="text-center">Burst</th>
                <th>Tempo Restante</th>
                <th>Progresso</th>
                <th className="text-center">Estado</th>
                <th className="text-center">Espera</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {processes.map((process) => (
                  <ProcessRow
                    key={process.id}
                    process={process}
                    onRemove={handleRemove}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
      </section>
    </div>
  );
};

export default Escalonador;