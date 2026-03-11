package com.monitoring.iotmon.data.models

import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import java.lang.reflect.Type

class FlexibleIntAdapter : JsonDeserializer<Int> {
    override fun deserialize(
        json: JsonElement?,
        typeOfT: Type?,
        context: JsonDeserializationContext?
    ): Int {
        if (json == null || json.isJsonNull) {
            return 0
        }

        val primitive = json.asJsonPrimitive

        return when {
            primitive.isBoolean -> if (primitive.asBoolean) 1 else 0
            primitive.isNumber -> primitive.asInt
            primitive.isString -> {
                when (primitive.asString.trim().lowercase()) {
                    "true" -> 1
                    "false" -> 0
                    "" -> 0
                    else -> primitive.asString.toIntOrNull() ?: 0
                }
            }
            else -> 0
        }
    }
}
