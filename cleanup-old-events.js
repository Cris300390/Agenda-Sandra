// COPIA Y PEGA ESTE CÓDIGO EN LA CONSOLA DEL NAVEGADOR (F12)
// Con la aplicación abierta en http://localhost:5173

(async function cleanupOldEvents() {
  try {
    console.log('🧹 Iniciando limpieza completa de eventos fuera del horario 16:00-22:00...')
    
    // Acceder a Dexie directamente
    const dbName = 'AgendaSandra'
    const request = indexedDB.open(dbName)
    
    request.onsuccess = async function(event) {
      const idb = event.target.result
      const transaction = idb.transaction(['classes'], 'readwrite')
      const store = transaction.objectStore('classes')
      
      // Obtener todas las clases
      const getAllRequest = store.getAll()
      
      getAllRequest.onsuccess = async function() {
        const allClasses = getAllRequest.result
        console.log(`📊 Total de clases encontradas: ${allClasses.length}`)
        
        // Filtrar clases fuera del horario
        const classesToDelete = allClasses.filter(cls => {
          const hour = new Date(cls.start).getHours()
          return hour < 16 || hour >= 22
        })
        
        console.log(`🗑️ Clases a eliminar: ${classesToDelete.length}`)
        
        if (classesToDelete.length > 0) {
          // Mostrar detalles de las clases a eliminar
          classesToDelete.forEach(cls => {
            const startDate = new Date(cls.start)
            console.log(`   - Clase ID ${cls.id}: ${startDate.toLocaleString()}`)
          })
          
          // Eliminar las clases
          const deleteTransaction = idb.transaction(['classes'], 'readwrite')
          const deleteStore = deleteTransaction.objectStore('classes')
          
          for (const cls of classesToDelete) {
            deleteStore.delete(cls.id)
          }
          
          deleteTransaction.oncomplete = function() {
            console.log(`✅ Se eliminaron ${classesToDelete.length} clases exitosamente`)
            alert(`✅ Limpieza completada: se eliminaron ${classesToDelete.length} clases fuera del horario. Recarga la página para ver los cambios.`)
            // Recargar la página para actualizar la vista
            window.location.reload()
          }
        } else {
          console.log('✨ No hay clases fuera del horario para eliminar')
          alert('✨ No hay clases fuera del horario para eliminar')
        }
      }
    }
    
    request.onerror = function() {
      console.error('❌ Error al acceder a la base de datos')
      alert('❌ Error al acceder a la base de datos. Asegúrate de que la aplicación esté abierta.')
    }
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
    alert('❌ Error durante la limpieza: ' + error.message)
  }
})()
