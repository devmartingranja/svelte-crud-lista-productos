<script>
  import { getCategoria } from "../tools.js";
  import { createEventDispatcher } from "svelte"
  export let nombre;
  export let descripcion;
  export let categoria;
  export let id;
  export let imgURL;

  const dispatch = createEventDispatcher();

  const eliminar = (id) => {
     dispatch('productoDelete', {id})
  }

  const actualizar = (id) => {      
     dispatch('productoUpdate', { producto : $$props} )
  }

</script>

<style>
</style>

<div class="card m-2">
  <div class="row">
    <div class="col-md-4">
      {#if imgURL}
        <img src={imgURL} alt="" class="img-fluid p-2" width="100%" />
      {:else}
        <img
          src="img/no-product.png"
          alt=""
          class="img-fluid p-2"
          width="100%" />
      {/if}
    </div>
    <div class="col-md-8">
      <div class="card-body">
        <h5>
          <strong>{nombre}</strong>
          <span>
            <small>{getCategoria(categoria)}</small>
          </span>
        </h5>
        <p class="card-text">{descripcion}</p>
        <button class="btn btn-danger" on:click={eliminar(id)}>Delete</button>
        <button class="btn btn-secondary" on:click={actualizar(id)}>Edit</button>
      </div>

    </div>
  </div>
</div>
