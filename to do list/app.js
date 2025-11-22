import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const userId = "USER_ID"; // Replace with logged-in user ID

  useEffect(() => {
    axios.get(`http://localhost:4000/tasks/${userId}`).then(res => setTasks(res.data));
  }, []);

  const addTask = async () => {
    const res = await axios.post("http://localhost:4000/tasks", { userId, title });
    setTasks([...tasks, res.data]);
    setTitle("");
  };

  const toggleTask = async (id, completed) => {
    const res = await axios.put(`http://localhost:4000/tasks/${id}`, { completed: !completed });
    setTasks(tasks.map(t => t._id === id ? res.data : t));
  };

  const deleteTask = async (id) => {
    await axios.delete(`http://localhost:4000/tasks/${id}`);
    setTasks(tasks.filter(t => t._id !== id));
  };

  return (
    <div>
      <h2>To-Do List</h2>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="New Task"/>
      <button onClick={addTask}>Add</button>
      <ul>
        {tasks.map(t => (
          <li key={t._id}>
            <span style={{ textDecoration: t.completed ? "line-through" : "" }}>{t.title}</span>
            <button onClick={() => toggleTask(t._id, t.completed)}>Toggle</button>
            <button onClick={() => deleteTask(t._id)}>Delete</button>
          </li>
        ))}
      </ul>
      <a href={`http://localhost:4000/export/${userId}`}>Export to Excel</a>
    </div>
  );
}

export default App;