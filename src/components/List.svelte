<script>
  import CardList from "./CardList.svelte";
  import {notyDanger} from "../tools"
  export let productos = [];
  export let producto;

  const productoDelete =  e => {    
    let id = e.detail.id
   
    notyDanger("Eliminado el producto ?", () => {
       productos = productos.filter(p => p.id != id)
    })
  }

  const productoUpdate  = e => {
    producto = e.detail.producto      
  }

</script>
<style>

</style>

{#each productos as producto}
    <CardList {...producto} on:productoDelete={productoDelete} on:productoUpdate={productoUpdate} />
{/each}
