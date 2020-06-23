<script>
  import { vec } from "../tools.js";
  import { createEventDispatcher } from "svelte";
  import ProductosClass from "../productoClass.js";
  export let nameApp;

  const dispatch = createEventDispatcher();
  export let producto = new ProductosClass();

  const clearProducto = { ...producto };

  const cleanProducto = () => {
    producto = { ...clearProducto };
  };

  const onSubmitHandler = e => {
    if (producto.id) {
      dispatch("productosUpdate");
    } else {
      dispatch("productosAdd");
    }

    cleanProducto();
  };

  $: tipoProceso = producto.id ? "Editar producto" : "Guardar producto";
</script>

<style>

</style>

<form on:submit|preventDefault={onSubmitHandler}>

  <div class="form-group">
    <input
      bind:value={producto.nombre}
      type="text"
      placeholder="Nombre Producto"
      class="form-control" />
  </div>

  <div class="form-group">
    <textarea
      bind:value={producto.descripcion}
      id="des-producto"
      rows="3"
      placeholder="Descripcion del producto"
      class="form-control" />
  </div>

  <div class="form-group">
    <input
      bind:value={producto.imgURL}
      type="url"
      id="img-url-producto"
      placeholder="https://dev.martin.com"
      class="form-control" />
  </div>

  <div class="form-group">
    <select id="cateroria" bind:value={producto.categoria} class="form-control">
      {#each vec as producto, i}
        <option value={i}>{producto}</option>
      {/each}
    </select>
  </div>

  <button class="btn btn-secondary">{tipoProceso}</button>

  <button
    class="btn btn-secondary"
    on:click|preventDefault={e => {
      cleanProducto();
    }}>
    Reiniciar
  </button>

</form>
<p class="mt-3">{nameApp}</p>
