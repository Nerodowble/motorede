package expo.modules.compartilharia

import android.content.ClipData
import android.content.Intent
import android.net.Uri
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Entrega a foto da moto direto ao app de IA escolhido (Gemini, ChatGPT, Meta AI),
 * sem a folha de compartilhamento. O expo-intent-launcher não serve: manda o
 * EXTRA_STREAM como texto e só usa o pacote junto com o nome da Activity.
 */
class CompartilharIaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CompartilharIa")

    Function("instalado") { pacote: String ->
      val contexto = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      contexto.packageManager.getLaunchIntentForPackage(pacote) != null
    }

    AsyncFunction("enviarImagem") { pacote: String, contentUri: String, texto: String? ->
      val atividade = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      val uri = Uri.parse(contentUri)
      val intent = Intent(Intent.ACTION_SEND).apply {
        type = "image/*"
        setPackage(pacote)
        putExtra(Intent.EXTRA_STREAM, uri)
        // ClipData leva a permissão de leitura junto com o URI.
        clipData = ClipData.newRawUri("", uri)
        if (texto != null) putExtra(Intent.EXTRA_TEXT, texto)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      // ActivityNotFoundException sobe como erro: o JS cai na folha do sistema.
      atividade.startActivity(intent)
    }
  }
}
