import Noty from "noty";
import "noty/lib/noty.css";
import "noty/lib/themes/metroui.css";

export const vec = ['laptops', 'periferico', 'servidor'];

export function getCategoria(id = 0) {
    return vec[id]
}

export function notySuccess(msj = "") {

    new Noty({
        theme: "metroui",
        type: "success",
        timeout: 3000,
        text: msj
    }).show();

}

export function notyDanger(msj = "", callback = () => {}) {
   
   const n = new Noty({
        text: msj,
        theme: "metroui",
        buttons: [
          Noty.button('SI', 'btn btn-success', function () {
            callback()
            n.close();
          }, {id: 'button1', 'data-status': 'ok'}),
      
          Noty.button('NO', 'btn btn-error', function () {             
              n.close();
          })
        ]
      });

      n.show();

}