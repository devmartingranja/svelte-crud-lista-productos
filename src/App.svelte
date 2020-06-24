<script>
  import { v4 as uuidv4 } from "uuid";
  import Form from "./components/Form.svelte";
  import List from "./components/List.svelte";
  import {notySuccess} from "./tools"
  import data from "./persistencia.js"
  import ProductoClass from "./productoClass.js"
  export let name;  

  $: productos = data
  $: producto = new ProductoClass();

  const productosAdd = event => {
    const auxNewProducto = {
      ...producto,
      id: uuidv4()
    };

    //productos = productos.concat(auxNewProducto);
    productos = [...productos, auxNewProducto];

    notySuccess("Producto Ingresado !!")

  };

  const productosUpdate = event => {
    productos = productos.map(e => (e.id == producto.id ? producto : e));
    notySuccess("Producto Actualizado !!");
  };
</script>

<style>

</style>

<main>
  <div class="container p-4">
    <div class="row">
      <div class="col-md-6 mt-5">

        <div class="card">
          <div class="card-header">
            <h2>LISTA DE PRODUCTOS</h2>
          </div>
          <div class="card-body bg-light">
            <List bind:productos bind:producto />
          </div>
        </div>

      </div>
      <div class="col-md-6 mt-5">

        <div class="card">
          <div class="card-header">
            <h2>FORMULARIO DE PRODUCTOS</h2>
          </div>
          <div class="card-body">
            <Form
              on:productosAdd={productosAdd}
              on:productosUpdate={productosUpdate}
              bind:producto 
              nameApp={name}
              />
          </div>

        </div>
      </div>

    </div>

  </div>

</main>
